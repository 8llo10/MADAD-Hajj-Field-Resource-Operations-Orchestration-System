import { Router } from "express";
import { z } from "zod";
import {
    IncidentSeverity,
    IncidentStatus,
    Role,
} from "@prisma/client";

import { prisma } from "../../db.js";
import { asyncHandler } from "../../lib/async.js";
import {
    authenticate,
    authorize,
} from "../../middleware/auth.js";
import { audit } from "../../lib/audit.js";
import { AppError } from "../../lib/errors.js";
import { analyzeIncident } from "../ai/ai.service.js";
import { emitOps } from "../../realtime.js";

const router = Router();

router.use(authenticate);

const createSchema = z.object({
    title: z.string().min(4),
    description: z.string().min(8),
    category: z.string().min(2),

    severity: z.nativeEnum(IncidentSeverity),

    siteId: z.string(),
    zoneId: z.string().optional().nullable(),

    latitude: z.number(),
    longitude: z.number(),

    peopleAffected: z
        .number()
        .int()
        .min(0)
        .default(0),

    slaMinutes: z
        .number()
        .int()
        .min(5)
        .default(60),

    requiredSkills: z
        .array(z.string())
        .default([]),

    requiredCapabilities: z
        .array(z.string())
        .default([]),

    source: z
        .string()
        .default("COMMAND_CENTER"),
});

/* =========================================================
   GET INCIDENTS
   ========================================================= */

router.get(
    "/",
    asyncHandler(async (req, res) => {
        const status =
            typeof req.query.status === "string"
                ? (req.query.status as IncidentStatus)
                : undefined;

        const severity =
            typeof req.query.severity === "string"
                ? (req.query.severity as IncidentSeverity)
                : undefined;

        const q =
            typeof req.query.q === "string"
                ? req.query.q.trim()
                : "";

        const rows =
            await prisma.incident.findMany({
                where: {
                    status,
                    severity,

                    OR: q
                        ? [
                            {
                                code: {
                                    contains: q,
                                    mode: "insensitive",
                                },
                            },
                            {
                                title: {
                                    contains: q,
                                    mode: "insensitive",
                                },
                            },
                        ]
                        : undefined,
                },

                include: {
                    site: true,
                    zone: true,

                    dispatches: {
                        include: {
                            team: true,
                        },

                        orderBy: {
                            proposedAt: "desc",
                        },

                        take: 1,
                    },
                },

                orderBy: {
                    openedAt: "desc",
                },

                take: 200,
            });

        res.json(rows);
    })
);

/* =========================================================
   GET INCIDENT BY ID
   ========================================================= */

router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const id = String(req.params.id);

        const row =
            await prisma.incident.findUnique({
                where: {
                    id,
                },

                include: {
                    site: true,
                    zone: true,

                    dispatches: {
                        include: {
                            team: true,

                            resources: {
                                include: {
                                    resource: true,
                                },
                            },
                        },
                    },

                    statusEvents: {
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
            });

        if (!row) {
            throw new AppError(
                404,
                "Incident not found"
            );
        }

        res.json(row);
    })
);

/* =========================================================
   CREATE INCIDENT
   ========================================================= */

router.post(
    "/",
    authorize(
        Role.ADMIN,
        Role.COMMANDER,
        Role.DISPATCHER,
        Role.SUPERVISOR
    ),

    asyncHandler(async (req, res) => {
        const p = createSchema.parse(req.body);

        const count =
            await prisma.incident.count();

        const code =
            `INC-${new Date().getFullYear()}-` +
            `${String(count + 1).padStart(5, "0")}`;

        const site =
            await prisma.site.findUnique({
                where: {
                    id: p.siteId,
                },
            });

        if (!site) {
            throw new AppError(
                400,
                "Invalid site"
            );
        }

        const zone = p.zoneId
            ? await prisma.zone.findUnique({
                where: {
                    id: p.zoneId,
                },
            })
            : null;

        if (
            p.zoneId &&
            (!zone || zone.siteId !== p.siteId)
        ) {
            throw new AppError(
                400,
                "Invalid zone for selected site"
            );
        }

        const availableTeamCount =
            await prisma.team.count({
                where: {
                    siteId: p.siteId,
                    status: "AVAILABLE",
                },
            });

        /*
         * AI/risk analysis is calculated for
         * the API response only.
         *
         * Current Prisma Incident model does
         * not contain AI persistence fields.
         */
        const ai = analyzeIncident({
            severity: p.severity,
            ageMinutes: 0,

            // Current Zone/Site schema does not
            // persist these operational signals.
            crowdDensity: 3,
            siteCriticality: 3,

            peopleAffected:
                p.peopleAffected,

            availableTeamCount,

            requiredSkills:
                p.requiredSkills.length,
        });

        const row =
            await prisma.incident.create({
                data: {
                    code,

                    title: p.title,
                    description: p.description,
                    category: p.category,

                    requiredSkills:
                        p.requiredSkills,

                    severity: p.severity,

                    status:
                        IncidentStatus.OPEN,

                    siteId: p.siteId,
                    zoneId:
                        p.zoneId ?? null,

                    latitude:
                        p.latitude,

                    longitude:
                        p.longitude,

                    slaMinutes:
                        p.slaMinutes,

                    statusEvents: {
                        create: {
                            toStatus:
                                IncidentStatus.OPEN,

                            actorId:
                                req.user!.id,

                            note:
                                "Incident created",
                        },
                    },
                },
            });

        await audit(
            req,
            "CREATE",
            "Incident",
            row.id,
            undefined,
            row
        );

        emitOps(
            "incident.created",
            row
        );

        res.status(201).json({
            ...row,
            ai,
        });
    })
);

/* =========================================================
   UPDATE INCIDENT STATUS
   ========================================================= */

router.patch(
    "/:id/status",

    authorize(
        Role.ADMIN,
        Role.COMMANDER,
        Role.DISPATCHER,
        Role.SUPERVISOR,
        Role.TECHNICIAN
    ),

    asyncHandler(async (req, res) => {
        const id =
            String(req.params.id);

        const p = z
            .object({
                status:
                    z.nativeEnum(
                        IncidentStatus
                    ),

                note: z
                    .string()
                    .max(500)
                    .optional(),
            })
            .parse(req.body);

        const before =
            await prisma.incident.findUnique({
                where: {
                    id,
                },
            });

        if (!before) {
            throw new AppError(
                404,
                "Incident not found"
            );
        }

        const timeFields: {
            assignedAt?: Date;
            resolvedAt?: Date;
            closedAt?: Date;
        } = {};

        if (
            p.status ===
            IncidentStatus.ASSIGNED
        ) {
            timeFields.assignedAt =
                new Date();
        }

        if (
            p.status ===
            IncidentStatus.RESOLVED
        ) {
            timeFields.resolvedAt =
                new Date();
        }

        if (
            p.status ===
            IncidentStatus.CLOSED
        ) {
            timeFields.closedAt =
                new Date();
        }

        const row =
            await prisma.$transaction(
                async (tx) => {
                    const updated =
                        await tx.incident.update({
                            where: {
                                id: before.id,
                            },

                            data: {
                                status: p.status,
                                ...timeFields,
                            },
                        });

                    await tx
                        .incidentStatusEvent
                        .create({
                            data: {
                                incidentId:
                                    before.id,

                                fromStatus:
                                    before.status,

                                toStatus:
                                    p.status,

                                note:
                                    p.note,

                                actorId:
                                    req.user!.id,
                            },
                        });

                    return updated;
                }
            );

        await audit(
            req,
            "STATUS_CHANGE",
            "Incident",
            row.id,
            before,
            row
        );

        emitOps(
            "incident.updated",
            row
        );

        res.json(row);
    })
);

export default router;