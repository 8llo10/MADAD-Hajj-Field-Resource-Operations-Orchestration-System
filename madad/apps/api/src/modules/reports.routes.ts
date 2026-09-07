import { Router } from "express";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../lib/async.js";

const router = Router();

router.use(authenticate);

router.get(
  "/reports/operations",
  asyncHandler(async (_req, res) => {
    const since = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    const [
      bySeverity,
      byStatus,
      sites,
      teams,
      resolved,
    ] = await Promise.all([
      prisma.incident.groupBy({
        by: ["severity"],
        where: {
          openedAt: {
            gte: since,
          },
        },
        _count: true,
      }),

      prisma.incident.groupBy({
        by: ["status"],
        where: {
          openedAt: {
            gte: since,
          },
        },
        _count: true,
      }),

      prisma.site.findMany({
        include: {
          _count: {
            select: {
              incidents: true,
              teams: true,
              resources: true,
            },
          },
        },
      }),

      prisma.team.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          activeJobs: true,
          maxConcurrentJobs: true,

          _count: {
            select: {
              dispatches: true,
            },
          },
        },
      }),

      prisma.incident.findMany({
        where: {
          resolvedAt: {
            not: null,
          },

          openedAt: {
            gte: since,
          },
        },

        select: {
          openedAt: true,
          resolvedAt: true,
          severity: true,
          siteId: true,
        },
      }),
    ]);

    const resolutionMinutes =
      resolved.map((incident) => {
        return (
          incident.resolvedAt!.getTime() -
          incident.openedAt.getTime()
        ) / 60000;
      });

    const percentile = (
      values: number[],
      p: number
    ) => {
      if (!values.length) {
        return 0;
      }

      const sorted = [...values].sort(
        (a, b) => a - b
      );

      const index = Math.min(
        sorted.length - 1,
        Math.floor(
          (sorted.length - 1) * p
        )
      );

      return Math.round(
        sorted[index]
      );
    };

    const avgResolutionMinutes =
      resolutionMinutes.length
        ? Math.round(
          resolutionMinutes.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          resolutionMinutes.length
        )
        : 0;

    res.json({
      period: "7d",

      incidentsBySeverity:
        bySeverity,

      incidentsByStatus:
        byStatus,

      sites,
      teams,

      performance: {
        resolvedCount:
          resolved.length,

        avgResolutionMinutes,

        p50ResolutionMinutes:
          percentile(
            resolutionMinutes,
            0.5
          ),

        p90ResolutionMinutes:
          percentile(
            resolutionMinutes,
            0.9
          ),
      },
    });
  })
);

export default router;