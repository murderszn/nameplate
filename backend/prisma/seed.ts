/**
 * Nameplate — demo seed data.
 *
 * Builds one realistic apartment-portfolio org so the HQ console has
 * real numbers to render: an Organization, 4 Properties, a handful of
 * Buildings/Units per property, ~20 Assets (mixed categories/statuses),
 * a couple of Parts with cross-asset lineage, several ServiceEvents
 * (including the parts-lineage swap), and WorkOrders in different
 * states. Idempotent-ish: safe to re-run against a wiped dev DB; not
 * safe to run twice against the same DB without clearing first (will
 * throw on unique constraints like org slug / asset npid).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function npid(): string {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32-ish
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `NP-${s}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log('Seeding Nameplate demo data...');

  // -------------------------------------------------------------------
  // Organization
  // -------------------------------------------------------------------
  const org = await prisma.organization.create({
    data: {
      name: 'Sonoran Portfolio Management',
      slug: 'sonoran-portfolio-management',
      plan: 'pilot',
      timezone: 'America/Phoenix',
      currency: 'USD',
      settings: {
        replace_threshold_pct: 60,
        replace_approval_limit_usd: 400,
        sla_hours: { emergency: 4, urgent: 24, standard: 72, low: 168 },
        require_photo_on_service: true,
        allow_tech_asset_create: true,
      },
    },
  });

  // -------------------------------------------------------------------
  // Users & memberships
  // -------------------------------------------------------------------
  const owner = await prisma.user.create({
    data: {
      email: 'joshua.johnson@beghou.com',
      fullName: 'Joshua Johnson',
      status: 'active',
    },
  });
  const tech1 = await prisma.user.create({
    data: { email: 'marcus.chen@sonoran.example', fullName: 'Marcus Chen', status: 'active' },
  });
  const tech2 = await prisma.user.create({
    data: { email: 'elena.ruiz@sonoran.example', fullName: 'Elena Ruiz', status: 'active' },
  });

  await prisma.membership.create({
    data: { orgId: org.id, userId: owner.id, role: 'owner', employmentType: 'employee', status: 'active' },
  });
  const membershipTech1 = await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: tech1.id,
      role: 'technician',
      employmentType: 'employee',
      hourlyLaborRate: 28.5,
      status: 'active',
    },
  });
  const membershipTech2 = await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: tech2.id,
      role: 'lead_tech',
      employmentType: 'employee',
      hourlyLaborRate: 34,
      status: 'active',
    },
  });

  // -------------------------------------------------------------------
  // Asset categories (system-seeded)
  // -------------------------------------------------------------------
  const categoryDefs = [
    { key: 'washer', displayName: 'Washer', defaultUsefulLifeMonths: 132, defaultReplacementCost: 650 },
    { key: 'dryer', displayName: 'Dryer', defaultUsefulLifeMonths: 144, defaultReplacementCost: 550 },
    { key: 'range', displayName: 'Range / Oven', defaultUsefulLifeMonths: 180, defaultReplacementCost: 700 },
    { key: 'refrigerator', displayName: 'Refrigerator', defaultUsefulLifeMonths: 156, defaultReplacementCost: 900 },
    { key: 'dishwasher', displayName: 'Dishwasher', defaultUsefulLifeMonths: 120, defaultReplacementCost: 480 },
    { key: 'water_heater', displayName: 'Water Heater', defaultUsefulLifeMonths: 120, defaultReplacementCost: 1100 },
    { key: 'hvac_air_handler', displayName: 'HVAC Air Handler', defaultUsefulLifeMonths: 216, defaultReplacementCost: 3200 },
    { key: 'microwave', displayName: 'Microwave', defaultUsefulLifeMonths: 108, defaultReplacementCost: 220 },
  ];
  const categories: Record<string, { id: string }> = {};
  for (const c of categoryDefs) {
    categories[c.key] = await prisma.assetCategory.create({ data: c });
  }

  // -------------------------------------------------------------------
  // Asset models (crowd catalog)
  // -------------------------------------------------------------------
  const modelDefs = [
    { manufacturer: 'Whirlpool', modelNumber: 'WTW5000DW2', categoryKey: 'washer', displayName: 'Whirlpool 4.3 cu ft Top-Load Washer', typicalReplacementCost: 620 },
    { manufacturer: 'Whirlpool', modelNumber: 'WED4815EW1', categoryKey: 'dryer', displayName: 'Whirlpool 7.0 cu ft Electric Dryer', typicalReplacementCost: 540 },
    { manufacturer: 'GE', modelNumber: 'JBS360RMSS', categoryKey: 'range', displayName: 'GE 30" Free-Standing Electric Range', typicalReplacementCost: 680 },
    { manufacturer: 'GE', modelNumber: 'GTS18FTLKWW', categoryKey: 'refrigerator', displayName: 'GE 17.5 cu ft Top-Freezer Refrigerator', typicalReplacementCost: 870 },
    { manufacturer: 'Frigidaire', modelNumber: 'FFTR1835VW', categoryKey: 'refrigerator', displayName: 'Frigidaire 18.3 cu ft Top-Freezer Refrigerator', typicalReplacementCost: 810 },
    { manufacturer: 'Bosch', modelNumber: 'SHEM63W55N', categoryKey: 'dishwasher', displayName: 'Bosch 100 Series Dishwasher', typicalReplacementCost: 520 },
    { manufacturer: 'Rheem', modelNumber: 'XE50T06ST45U1', categoryKey: 'water_heater', displayName: 'Rheem 50 Gal Electric Water Heater', typicalReplacementCost: 1150 },
    { manufacturer: 'Carrier', modelNumber: '25HCB448A003', categoryKey: 'hvac_air_handler', displayName: 'Carrier 4-Ton Air Handler', typicalReplacementCost: 3400 },
    { manufacturer: 'Trane', modelNumber: 'TAM9A0C48H31', categoryKey: 'hvac_air_handler', displayName: 'Trane 4-Ton Air Handler', typicalReplacementCost: 3550 },
    { manufacturer: 'Maytag', modelNumber: 'MVW6230HW', categoryKey: 'washer', displayName: 'Maytag 4.7 cu ft Top-Load Washer', typicalReplacementCost: 690 },
    { manufacturer: 'Amana', modelNumber: 'AMV2307PFB', categoryKey: 'microwave', displayName: 'Amana 1.6 cu ft Over-the-Range Microwave', typicalReplacementCost: 210 },
  ];
  const models: Record<string, { id: string; categoryKey: string }> = {};
  for (const m of modelDefs) {
    const row = await prisma.assetModel.create({
      data: {
        manufacturer: m.manufacturer,
        modelNumber: m.modelNumber,
        categoryId: categories[m.categoryKey].id,
        displayName: m.displayName,
        typicalReplacementCost: m.typicalReplacementCost,
        verificationStatus: 'verified',
        firstSeenOrgId: org.id,
      },
    });
    models[`${m.manufacturer}:${m.modelNumber}`] = { id: row.id, categoryKey: m.categoryKey };
  }

  // -------------------------------------------------------------------
  // Properties, buildings, units
  // -------------------------------------------------------------------
  const propertyDefs = [
    {
      name: 'Copper Ridge Apartments',
      code: 'CR-01',
      addressLine1: '4820 E Copper Ridge Rd',
      city: 'Tucson',
      state: 'AZ',
      postalCode: '85712',
      yearBuilt: 1998,
      unitCountDeclared: 220,
      buildings: ['Building A', 'Building B'],
      unitsPerBuilding: 4,
    },
    {
      name: 'Desert Willow Commons',
      code: 'DW-02',
      addressLine1: '1150 N Desert Willow Blvd',
      city: 'Phoenix',
      state: 'AZ',
      postalCode: '85021',
      yearBuilt: 2005,
      unitCountDeclared: 160,
      buildings: ['Building 1', 'Building 2'],
      unitsPerBuilding: 3,
    },
    {
      name: 'Saguaro Vista Apartments',
      code: 'SV-03',
      addressLine1: '3390 S Saguaro Vista Dr',
      city: 'Mesa',
      state: 'AZ',
      postalCode: '85210',
      yearBuilt: 1989,
      unitCountDeclared: 96,
      buildings: ['Main'],
      unitsPerBuilding: 5,
    },
    {
      name: 'Ocotillo Park Residences',
      code: 'OP-04',
      addressLine1: '710 W Ocotillo Park Ln',
      city: 'Tempe',
      state: 'AZ',
      postalCode: '85281',
      yearBuilt: 2012,
      unitCountDeclared: 140,
      buildings: ['Main'],
      unitsPerBuilding: 3,
    },
  ];

  type UnitRow = { id: string; propertyId: string; buildingId: string; label: string };
  const properties: { id: string; name: string }[] = [];
  const allUnits: UnitRow[] = [];

  for (const p of propertyDefs) {
    const property = await prisma.property.create({
      data: {
        orgId: org.id,
        name: p.name,
        code: p.code,
        addressLine1: p.addressLine1,
        city: p.city,
        state: p.state,
        postalCode: p.postalCode,
        country: 'US',
        yearBuilt: p.yearBuilt,
        unitCountDeclared: p.unitCountDeclared,
        status: 'active',
      },
    });
    properties.push({ id: property.id, name: property.name });

    for (const buildingName of p.buildings) {
      const building = await prisma.building.create({
        data: { orgId: org.id, propertyId: property.id, name: buildingName, floors: 2 },
      });

      for (let i = 1; i <= p.unitsPerBuilding; i++) {
        const label = `${100 + i}`;
        const unit = await prisma.unit.create({
          data: {
            orgId: org.id,
            propertyId: property.id,
            buildingId: building.id,
            label,
            floor: i <= p.unitsPerBuilding / 2 ? 1 : 2,
            bedrooms: i % 2 === 0 ? 2 : 1,
            bathrooms: i % 2 === 0 ? 2 : 1,
            squareFeet: 650 + i * 40,
            occupancyStatus: 'occupied',
          },
        });
        allUnits.push({ id: unit.id, propertyId: property.id, buildingId: building.id, label });
      }
    }
  }

  // -------------------------------------------------------------------
  // Assets — 20 total, spread across units, realistic status mix
  // -------------------------------------------------------------------
  type AssetPlan = {
    categoryKey: string;
    modelKey?: string;
    status: 'active' | 'needs_repair' | 'unaccounted_for' | 'in_repair' | 'retired';
    condition: 'new' | 'good' | 'fair' | 'poor' | 'failed';
    installMonthsAgo: number;
  };

  const plans: AssetPlan[] = [
    { categoryKey: 'washer', modelKey: 'Whirlpool:WTW5000DW2', status: 'active', condition: 'good', installMonthsAgo: 30 },
    { categoryKey: 'washer', modelKey: 'Maytag:MVW6230HW', status: 'active', condition: 'good', installMonthsAgo: 12 },
    { categoryKey: 'washer', modelKey: 'Whirlpool:WTW5000DW2', status: 'needs_repair', condition: 'poor', installMonthsAgo: 96 },
    { categoryKey: 'dryer', modelKey: 'Whirlpool:WED4815EW1', status: 'active', condition: 'good', installMonthsAgo: 30 },
    { categoryKey: 'dryer', modelKey: 'Whirlpool:WED4815EW1', status: 'active', condition: 'fair', installMonthsAgo: 84 },
    { categoryKey: 'dryer', status: 'active', condition: 'good', installMonthsAgo: 6 },
    { categoryKey: 'range', modelKey: 'GE:JBS360RMSS', status: 'active', condition: 'good', installMonthsAgo: 40 },
    { categoryKey: 'range', modelKey: 'GE:JBS360RMSS', status: 'active', condition: 'fair', installMonthsAgo: 90 },
    { categoryKey: 'range', status: 'needs_repair', condition: 'poor', installMonthsAgo: 130 },
    { categoryKey: 'refrigerator', modelKey: 'GE:GTS18FTLKWW', status: 'active', condition: 'good', installMonthsAgo: 20 },
    { categoryKey: 'refrigerator', modelKey: 'Frigidaire:FFTR1835VW', status: 'in_repair', condition: 'poor', installMonthsAgo: 132 },
    { categoryKey: 'refrigerator', modelKey: 'Frigidaire:FFTR1835VW', status: 'active', condition: 'good', installMonthsAgo: 8 },
    { categoryKey: 'refrigerator', status: 'unaccounted_for', condition: 'fair', installMonthsAgo: 60 },
    { categoryKey: 'dishwasher', modelKey: 'Bosch:SHEM63W55N', status: 'active', condition: 'good', installMonthsAgo: 18 },
    { categoryKey: 'dishwasher', status: 'active', condition: 'fair', installMonthsAgo: 70 },
    { categoryKey: 'dishwasher', status: 'unaccounted_for', condition: 'fair', installMonthsAgo: 55 },
    { categoryKey: 'water_heater', modelKey: 'Rheem:XE50T06ST45U1', status: 'active', condition: 'good', installMonthsAgo: 24 },
    { categoryKey: 'water_heater', status: 'needs_repair', condition: 'poor', installMonthsAgo: 110 },
    { categoryKey: 'hvac_air_handler', modelKey: 'Carrier:25HCB448A003', status: 'active', condition: 'good', installMonthsAgo: 36 },
    { categoryKey: 'hvac_air_handler', modelKey: 'Trane:TAM9A0C48H31', status: 'active', condition: 'fair', installMonthsAgo: 96 },
    { categoryKey: 'microwave', modelKey: 'Amana:AMV2307PFB', status: 'active', condition: 'good', installMonthsAgo: 15 },
    { categoryKey: 'microwave', status: 'retired', condition: 'failed', installMonthsAgo: 150 },
  ];

  const assets: { id: string; npid: string; categoryKey: string }[] = [];
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const unit = allUnits[i % allUnits.length];
    const model = plan.modelKey ? models[plan.modelKey] : undefined;
    const manufacturer = plan.modelKey ? plan.modelKey.split(':')[0] : undefined;
    const modelNumber = plan.modelKey ? plan.modelKey.split(':')[1] : undefined;

    const asset = await prisma.asset.create({
      data: {
        orgId: org.id,
        npid: npid(),
        categoryId: categories[plan.categoryKey].id,
        assetModelId: model?.id,
        manufacturerRaw: manufacturer,
        modelRaw: modelNumber,
        serialNumber: `SN${100000 + i * 137}`,
        serialConfidence: model ? 'scanned' : 'typed',
        currentLocationType: 'unit',
        currentUnitId: unit.id,
        currentPropertyId: unit.propertyId,
        currentLocationSince: daysAgo(plan.installMonthsAgo * 30),
        currentLocationConfirmedAt:
          plan.status === 'unaccounted_for' ? daysAgo(200) : daysAgo(Math.min(30, plan.installMonthsAgo)),
        status: plan.status,
        condition: plan.condition,
        acquisitionType: 'new_purchase',
        installDate: daysAgo(plan.installMonthsAgo * 30),
        installDateConfidence: 'known',
        purchaseCost: 400 + i * 25,
      },
    });
    assets.push({ id: asset.id, npid: asset.npid, categoryKey: plan.categoryKey });
  }

  const fridges = assets.filter((a) => a.categoryKey === 'refrigerator');
  const fridgeA = fridges[1]; // the in_repair Frigidaire (source of the salvage)
  const fridgeB = fridges[2]; // the newer active Frigidaire (receives the part)

  // -------------------------------------------------------------------
  // Work orders — different states
  // -------------------------------------------------------------------
  const woOpen = await prisma.workOrder.create({
    data: {
      orgId: org.id,
      propertyId: allUnits[0].propertyId,
      number: 1001,
      unitId: allUnits[8]?.id ?? allUnits[0].id,
      title: 'Range not heating evenly — tenant complaint',
      description: 'Tenant reports oven runs cold on one side.',
      source: 'tenant_request',
      priority: 'standard',
      status: 'open',
      requestedAction: 'diagnose',
      slaDueAt: daysAgo(-3),
      occurredAt: daysAgo(1),
    },
  });

  const woInProgress = await prisma.workOrder.create({
    data: {
      orgId: org.id,
      propertyId: fridgeA ? allUnits.find((u) => u.id)!.propertyId : allUnits[0].propertyId,
      number: 1002,
      assetId: fridgeA?.id,
      title: 'Refrigerator compressor failure — Unit repair in progress',
      description: 'Compressor failed; diagnosing repair vs replace.',
      source: 'technician',
      priority: 'urgent',
      status: 'in_progress',
      assignedTo: membershipTech2.id,
      requestedAction: 'diagnose',
      firstResponseAt: daysAgo(2),
      slaDueAt: daysAgo(-1),
      occurredAt: daysAgo(3),
    },
  });

  const woAwaitingParts = await prisma.workOrder.create({
    data: {
      orgId: org.id,
      propertyId: allUnits[0].propertyId,
      number: 1003,
      title: 'Water heater pilot repeatedly failing',
      description: 'Needs replacement thermocouple, on order.',
      source: 'inspection',
      priority: 'urgent',
      status: 'awaiting_parts',
      assignedTo: membershipTech1.id,
      requestedAction: 'repair',
      slaDueAt: daysAgo(-5),
      occurredAt: daysAgo(6),
    },
  });

  const woCompleted = await prisma.workOrder.create({
    data: {
      orgId: org.id,
      propertyId: fridgeB ? allUnits[0].propertyId : allUnits[0].propertyId,
      number: 1004,
      assetId: fridgeB?.id,
      title: 'Refrigerator not cooling — control board replaced',
      description: 'Installed salvaged control board from decommissioned unit.',
      source: 'tenant_request',
      priority: 'urgent',
      status: 'completed',
      assignedTo: membershipTech2.id,
      requestedAction: 'repair',
      resolution: 'repaired',
      firstResponseAt: daysAgo(9),
      completedAt: daysAgo(8),
      slaMet: true,
      actualCost: 0,
      occurredAt: daysAgo(9),
    },
  });

  // -------------------------------------------------------------------
  // Service events + parts lineage
  // -------------------------------------------------------------------
  // 1) Removal event on fridgeA: compressor failed, control board salvaged.
  const removalEvent = fridgeA
    ? await prisma.serviceEvent.create({
        data: {
          orgId: org.id,
          assetId: fridgeA.id,
          workOrderId: woInProgress.id,
          unitId: allUnits.find((u) => u.id)?.id,
          propertyId: woInProgress.propertyId,
          technicianId: membershipTech2.id,
          eventType: 'diagnostic',
          findings: 'Compressor seized; not economical to repair. Control board tested good — salvaging before scrap.',
          symptomCodes: ['not_cooling', 'noisy'],
          resolutionCode: 'unrepairable',
          conditionBefore: 'poor',
          conditionAfter: 'failed',
          statusBefore: 'needs_repair',
          statusAfter: 'in_repair',
          laborMinutes: 45,
          laborRate: 34,
          otherCost: 0,
          costBorneBy: 'owner',
          repairVsReplaceDecision: 'replaced',
          occurredAt: daysAgo(6),
        },
      })
    : null;

  let salvagedPart: { id: string } | null = null;
  if (fridgeA && removalEvent) {
    salvagedPart = await prisma.part.create({
      data: {
        orgId: org.id,
        label: 'Refrigerator main control board (salvaged)',
        componentType: 'control_board',
        origin: 'salvaged',
        sourceAssetId: fridgeA.id,
        sourceServiceEventId: removalEvent.id,
        salvagedAt: daysAgo(6),
        salvagedBy: membershipTech2.id,
        sourceAssetAgeMonthsAtSalvage: 132,
        condition: 'tested_good',
        status: 'installed',
        installedInAssetId: fridgeB?.id,
        acquisitionCost: 0,
        imputedValue: 215,
      },
    });
  }

  // 2) Install event on fridgeB: control board installed, part_usage records the lineage.
  if (fridgeB && salvagedPart) {
    const installEvent = await prisma.serviceEvent.create({
      data: {
        orgId: org.id,
        assetId: fridgeB.id,
        workOrderId: woCompleted.id,
        propertyId: woCompleted.propertyId,
        technicianId: membershipTech2.id,
        eventType: 'part_replacement',
        findings: 'Not cooling — control board failed. Installed salvaged, tested-good board from decommissioned Frigidaire.',
        symptomCodes: ['not_cooling', 'control_failure'],
        resolutionCode: 'part_replaced',
        conditionBefore: 'fair',
        conditionAfter: 'good',
        statusBefore: 'needs_repair',
        statusAfter: 'active',
        laborMinutes: 40,
        laborRate: 34,
        partsCost: 0,
        costBorneBy: 'owner',
        repairVsReplaceDecision: 'repaired',
        occurredAt: daysAgo(4),
      },
    });

    await prisma.partUsage.create({
      data: {
        orgId: org.id,
        serviceEventId: installEvent.id,
        assetId: fridgeB.id,
        partId: salvagedPart.id,
        action: 'installed',
        quantity: 1,
        unitCost: 0,
        costSource: 'zero_salvaged',
        occurredAt: daysAgo(4),
      },
    });
  }

  // 3) A handful of ordinary service events for history/cost data.
  const rangeNeedsRepair = assets.find((a) => a.categoryKey === 'range');
  const waterHeaterNeedsRepair = assets.filter((a) => a.categoryKey === 'water_heater')[1];
  const washerNeedsRepair = assets.filter((a) => a.categoryKey === 'washer')[2];

  if (rangeNeedsRepair) {
    await prisma.serviceEvent.create({
      data: {
        orgId: org.id,
        assetId: rangeNeedsRepair.id,
        workOrderId: woOpen.id,
        propertyId: woOpen.propertyId,
        technicianId: membershipTech1.id,
        eventType: 'inspection',
        findings: 'Left burner element reads open circuit; heating element likely failed.',
        symptomCodes: ['no_heat'],
        resolutionCode: 'needs_vendor',
        conditionBefore: 'poor',
        laborMinutes: 20,
        laborRate: 28.5,
        costBorneBy: 'owner',
        occurredAt: daysAgo(1),
      },
    });
  }

  if (waterHeaterNeedsRepair) {
    await prisma.serviceEvent.create({
      data: {
        orgId: org.id,
        assetId: waterHeaterNeedsRepair.id,
        workOrderId: woAwaitingParts.id,
        propertyId: woAwaitingParts.propertyId,
        technicianId: membershipTech1.id,
        eventType: 'diagnostic',
        findings: 'Pilot will not stay lit; thermocouple suspected faulty. Ordered replacement part.',
        symptomCodes: ['no_heat'],
        resolutionCode: 'deferred',
        conditionBefore: 'poor',
        laborMinutes: 30,
        laborRate: 28.5,
        estimatedRepairCostIfDeferred: 145,
        costBorneBy: 'owner',
        followUpRequired: true,
        occurredAt: daysAgo(6),
      },
    });
  }

  if (washerNeedsRepair) {
    await prisma.serviceEvent.create({
      data: {
        orgId: org.id,
        assetId: washerNeedsRepair.id,
        technicianId: membershipTech2.id,
        eventType: 'inspection',
        findings: 'Drum bearing noisy on spin cycle; monitor, schedule replacement if it worsens.',
        symptomCodes: ['noisy'],
        resolutionCode: 'deferred',
        conditionBefore: 'poor',
        laborMinutes: 15,
        laborRate: 34,
        estimatedRepairCostIfDeferred: 180,
        costBorneBy: 'owner',
        occurredAt: daysAgo(10),
      },
    });
  }

  console.log('Seed complete:');
  console.log(`  org: ${org.name} (${org.id})`);
  console.log(`  properties: ${properties.length}`);
  console.log(`  units: ${allUnits.length}`);
  console.log(`  assets: ${assets.length}`);
  console.log(`  work orders: 4 (open, in_progress, awaiting_parts, completed)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
