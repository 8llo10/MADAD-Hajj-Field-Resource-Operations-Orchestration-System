import { PrismaClient, Role, TeamStatus, ResourceStatus, ResourceType, IncidentSeverity, IncidentStatus, InventoryTxnType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.dispatchResource.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.incidentStatusEvent.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.site.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Madad@123', 12);
  const users = await Promise.all([
    prisma.user.create({ data: { email: 'admin@madad.sa', passwordHash, name: 'مدير النظام', role: Role.ADMIN } }),
    prisma.user.create({ data: { email: 'commander@madad.sa', passwordHash, name: 'قائد مركز العمليات', role: Role.COMMANDER } }),
    prisma.user.create({ data: { email: 'dispatcher@madad.sa', passwordHash, name: 'منسق التوجيه', role: Role.DISPATCHER } }),
    prisma.user.create({ data: { email: 'supervisor@madad.sa', passwordHash, name: 'مشرف ميداني', role: Role.SUPERVISOR } }),
    prisma.user.create({ data: { email: 'tech1@madad.sa', passwordHash, name: 'فني كهرباء', role: Role.TECHNICIAN } }),
    prisma.user.create({ data: { email: 'tech2@madad.sa', passwordHash, name: 'فني مياه', role: Role.TECHNICIAN } })
  ]);

  const mina = await prisma.site.create({ data: { code: 'MINA', name: 'منى', latitude: 21.4133, longitude: 39.8934 } });
  const arafat = await prisma.site.create({ data: { code: 'ARAFAT', name: 'عرفات', latitude: 21.3549, longitude: 39.9841 } });
  const muz = await prisma.site.create({ data: { code: 'MUZ', name: 'مزدلفة', latitude: 21.3891, longitude: 39.9108 } });

  const mina1 = await prisma.zone.create({ data: { code: 'MINA-1', name: 'منى - قطاع 1', siteId: mina.id, latitude: 21.4140, longitude: 39.8950 } });
  const mina2 = await prisma.zone.create({ data: { code: 'MINA-2', name: 'منى - قطاع 2', siteId: mina.id, latitude: 21.4098, longitude: 39.8870 } });
  const ara1 = await prisma.zone.create({ data: { code: 'ARAFAT-1', name: 'عرفات - قطاع 1', siteId: arafat.id, latitude: 21.3565, longitude: 39.9820 } });

  const teams = await Promise.all([
    prisma.team.create({ data: { code: 'ELEC-A', name: 'فريق الكهرباء ألف', specialization: 'Electrical', skills: ['Electrical', 'Generator', 'Low Voltage'], status: TeamStatus.AVAILABLE, siteId: mina.id, zoneId: mina1.id, latitude: 21.4142, longitude: 39.8948, maxConcurrentJobs: 2 } }),
    prisma.team.create({ data: { code: 'ELEC-B', name: 'فريق الكهرباء باء', specialization: 'Electrical', skills: ['Electrical', 'Generator'], status: TeamStatus.AVAILABLE, siteId: mina.id, zoneId: mina2.id, latitude: 21.4097, longitude: 39.8875, maxConcurrentJobs: 2 } }),
    prisma.team.create({ data: { code: 'WATER-A', name: 'فريق المياه ألف', specialization: 'Water', skills: ['Water', 'Pump', 'Plumbing'], status: TeamStatus.AVAILABLE, siteId: mina.id, zoneId: mina2.id, latitude: 21.4100, longitude: 39.8890, maxConcurrentJobs: 2 } }),
    prisma.team.create({ data: { code: 'HVAC-A', name: 'فريق التكييف', specialization: 'HVAC', skills: ['HVAC', 'Electrical'], status: TeamStatus.AVAILABLE, siteId: arafat.id, zoneId: ara1.id, latitude: 21.3558, longitude: 39.9810, maxConcurrentJobs: 2 } }),
    prisma.team.create({ data: { code: 'OPS-A', name: 'فريق الدعم العام', specialization: 'Operations', skills: ['Logistics', 'Safety', 'Field Support'], status: TeamStatus.AVAILABLE, siteId: muz.id, latitude: 21.3890, longitude: 39.9110, maxConcurrentJobs: 3 } })
  ]);

  await prisma.teamMember.createMany({ data: [
    { teamId: teams[0].id, userId: users[4].id },
    { teamId: teams[2].id, userId: users[5].id },
    { teamId: teams[4].id, userId: users[3].id }
  ]});

  await prisma.resource.createMany({ data: [
    { assetTag: 'VEH-001', name: 'مركبة ميدانية 1', type: ResourceType.VEHICLE, status: ResourceStatus.AVAILABLE, siteId: mina.id, latitude: 21.4130, longitude: 39.8920, capabilities: ['Transport', 'Field Support'] },
    { assetTag: 'GEN-001', name: 'مولد متنقل 250KVA', type: ResourceType.GENERATOR, status: ResourceStatus.AVAILABLE, siteId: mina.id, latitude: 21.4140, longitude: 39.8950, capabilities: ['Generator', 'Electrical'] },
    { assetTag: 'PUMP-001', name: 'مضخة مياه متنقلة', type: ResourceType.PUMP, status: ResourceStatus.AVAILABLE, siteId: mina.id, latitude: 21.4100, longitude: 39.8880, capabilities: ['Pump', 'Water'] },
    { assetTag: 'KIT-001', name: 'حقيبة أدوات كهربائية', type: ResourceType.KIT, status: ResourceStatus.AVAILABLE, siteId: mina.id, capabilities: ['Electrical', 'Low Voltage'] }
  ]});

  const inventory = await Promise.all([
    prisma.inventoryItem.create({ data: { sku: 'FUSE-100A', name: 'فيوز 100 أمبير', quantity: 18, reorderLevel: 8, unit: 'قطعة' } }),
    prisma.inventoryItem.create({ data: { sku: 'CABLE-16', name: 'كابل 16mm', quantity: 120, reorderLevel: 50, unit: 'متر' } }),
    prisma.inventoryItem.create({ data: { sku: 'VALVE-2', name: 'صمام 2 إنش', quantity: 4, reorderLevel: 6, unit: 'قطعة' } })
  ]);
  await prisma.inventoryTransaction.create({ data: { itemId: inventory[0].id, type: InventoryTxnType.RECEIPT, quantity: 18, reference: 'SEED' } });

  const incidentData = [
    { code: 'INC-2026-001', title: 'انقطاع كهربائي في قطاع 1', description: 'انقطاع مفاجئ في لوحة توزيع تخدم مجموعة مرافق.', category: 'Electrical', requiredSkills: ['Electrical', 'Generator'], severity: IncidentSeverity.CRITICAL, status: IncidentStatus.OPEN, siteId: mina.id, zoneId: mina1.id, latitude: 21.4141, longitude: 39.8952, slaMinutes: 20 },
    { code: 'INC-2026-002', title: 'انخفاض ضغط المياه', description: 'انخفاض ضغط شبكة المياه في القطاع الثاني.', category: 'Water', requiredSkills: ['Water', 'Pump'], severity: IncidentSeverity.HIGH, status: IncidentStatus.OPEN, siteId: mina.id, zoneId: mina2.id, latitude: 21.4099, longitude: 39.8888, slaMinutes: 30 },
    { code: 'INC-2026-003', title: 'عطل تكييف في مرفق تشغيلي', description: 'ارتفاع حرارة غرفة تشغيل بسبب عطل وحدة تكييف.', category: 'HVAC', requiredSkills: ['HVAC', 'Electrical'], severity: IncidentSeverity.MEDIUM, status: IncidentStatus.TRIAGED, siteId: arafat.id, zoneId: ara1.id, latitude: 21.3560, longitude: 39.9813, slaMinutes: 45 }
  ];
  for (const data of incidentData) {
    const inc = await prisma.incident.create({ data });
    await prisma.incidentStatusEvent.create({ data: { incidentId: inc.id, toStatus: inc.status, actorId: users[1].id, note: 'Seeded incident' } });
  }

  await prisma.notification.createMany({ data: [
    { userId: users[1].id, title: 'بلاغ حرج جديد', message: 'تم تسجيل انقطاع كهربائي حرج في منى - قطاع 1.' },
    { userId: users[2].id, title: 'جاهز للتوجيه', message: 'يوجد بلاغان مفتوحان يحتاجان مراجعة توصية الفرق.' }
  ]});

  console.log('MADAD seed complete. Login: admin@madad.sa / Madad@123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
