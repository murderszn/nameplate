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
  const techMorales = await prisma.user.create({
    data: { email: 'j.morales@sonoran.example', fullName: 'J. Morales', status: 'active' },
  });
  const techVance = await prisma.user.create({
    data: { email: 'd.vance@sonoran.example', fullName: 'D. Vance', status: 'active' },
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
  const membershipMorales = await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: techMorales.id,
      role: 'technician',
      employmentType: 'employee',
      hourlyLaborRate: 32,
      status: 'active',
    },
  });
  const membershipVance = await prisma.membership.create({
    data: {
      orgId: org.id,
      userId: techVance.id,
      role: 'technician',
      employmentType: 'employee',
      hourlyLaborRate: 30,
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
    { key: 'thermostat', displayName: 'Smart Thermostat', defaultUsefulLifeMonths: 84, defaultReplacementCost: 180 },
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
    { manufacturer: 'Carrier', modelNumber: 'FE4ANF002', categoryKey: 'hvac_air_handler', displayName: 'Carrier 2.5-Ton Variable Speed Air Handler', typicalReplacementCost: 3800 },
    { manufacturer: 'Speed Queen', modelNumber: 'FF7005WN', categoryKey: 'washer', displayName: 'Speed Queen Commercial Front-Load Washer', typicalReplacementCost: 1320 },
    { manufacturer: 'Whirlpool', modelNumber: 'WRF535SWHZ', categoryKey: 'refrigerator', displayName: 'Whirlpool 36" French Door Refrigerator', typicalReplacementCost: 1450 },
    { manufacturer: 'Speed Queen', modelNumber: 'DF7000WE', categoryKey: 'dryer', displayName: 'Speed Queen Electric Heavy Duty Dryer', typicalReplacementCost: 1250 },
    { manufacturer: 'GE', modelNumber: 'PDT715SYNFS', categoryKey: 'dishwasher', displayName: 'GE Profile Top Control Dishwasher', typicalReplacementCost: 899 },
    { manufacturer: 'Honeywell', modelNumber: 'RCHT9610WFW', categoryKey: 'thermostat', displayName: 'Honeywell Home T9 Smart Thermostat', typicalReplacementCost: 180 },
    { manufacturer: 'GE', modelNumber: 'PVM9005SJSS', categoryKey: 'microwave', displayName: 'GE Profile Over-the-Range Microwave & Vent', typicalReplacementCost: 540 },
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
        expectedLifeMonths: categoryDefs.find((c) => c.key === m.categoryKey)
          ?.defaultUsefulLifeMonths,
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
        expectedLifeMonths: categoryDefs.find((c) => c.key === plan.categoryKey)
          ?.defaultUsefulLifeMonths,
        warrantyExpiresOn: daysAgo(
          plan.installMonthsAgo * 30 -
            (plan.categoryKey === 'hvac_air_handler' ? 10 : 5) * 365,
        ),
        purchaseCost:
          (model
            ? modelDefs.find((d) => `${d.manufacturer}:${d.modelNumber}` === plan.modelKey)
                ?.typicalReplacementCost
            : undefined) ?? 400 + i * 25,
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

  // -------------------------------------------------------------------
  // Marketing-demo plate: Sonoran Ridge Residences · Unit 402
  // Mirrors website/js/main.js ASSET_RECORDS (NPIDs, warranty, lineage).
  // -------------------------------------------------------------------
  const ridge = await prisma.property.create({
    data: {
      orgId: org.id,
      name: 'Sonoran Ridge Residences',
      code: 'SR-05',
      addressLine1: '4820 E Camelback Rd',
      city: 'Phoenix',
      state: 'AZ',
      postalCode: '85018',
      country: 'US',
      latitude: 33.5092,
      longitude: -111.9783,
      yearBuilt: 2018,
      unitCountDeclared: 48,
      status: 'active',
    },
  });
  properties.push({ id: ridge.id, name: ridge.name });
  const ridgeBldg = await prisma.building.create({
    data: { orgId: org.id, propertyId: ridge.id, name: 'Building 4', floors: 4 },
  });
  const unit402 = await prisma.unit.create({
    data: {
      orgId: org.id,
      propertyId: ridge.id,
      buildingId: ridgeBldg.id,
      label: '402',
      floor: 4,
      bedrooms: 2,
      bathrooms: 2,
      squareFeet: 1180,
      occupancyStatus: 'occupied',
    },
  });
  allUnits.push({
    id: unit402.id,
    propertyId: ridge.id,
    buildingId: ridgeBldg.id,
    label: '402',
  });

  type ShowcasePart = { type: 'red' | 'white'; title: string; text: string };
  type ShowcaseLineage = {
    date: string;
    part: string;
    oem: string;
    findings: string;
    eventType:
      | 'preventive_maintenance'
      | 'part_replacement'
      | 'installation'
      | 'inspection'
      | 'warranty_service'
      | 'cleaning';
    techId: string;
    woNumber?: number;
    woTitle?: string;
    partsCost: number;
    laborMinutes: number;
    isWarranty: boolean;
    resolution: 'fixed' | 'part_replaced' | 'no_fault_found';
  };
  type ShowcaseAsset = {
    npid: string;
    categoryKey: string;
    modelKey: string;
    serial: string;
    serialConfidence: 'ocr' | 'scanned';
    title: string;
    room: string;
    purchaseDate: string;
    installDate: string;
    warrantyExpiresOn: string;
    warrantySub: string;
    cost: number;
    specTag: string;
    gps: string;
    description: string;
    schematicKey: string;
    parts: ShowcasePart[];
    lineage: ShowcaseLineage[];
  };

  const OWNER = 'Sonoran Portfolio Partners LLC · Fund IV';
  const showcaseDefs: ShowcaseAsset[] = [
    {
      npid: 'NP-1M4K9X23',
      categoryKey: 'hvac_air_handler',
      modelKey: 'Carrier:FE4ANF002',
      serial: '4821A90124',
      serialConfidence: 'ocr',
      title: 'Carrier 2.5-Ton Variable Speed Air Handler',
      room: 'Unit 402 · Utility / Mechanical Closet',
      purchaseDate: '2021-10-18',
      installDate: '2021-11-05',
      warrantyExpiresOn: '2031-11-05',
      warrantySub: '10-Yr Compressor Warranty',
      cost: 3800,
      specTag: 'HVAC & MECHANICAL · SPEC 01',
      gps: '33.5092° N, 111.9783° W',
      description:
        'Dual-stage forced-air heating and split condenser system. Tracks refrigerant lines, blower motor amperage, heating element resistance, and thermostat telemetry.',
      schematicKey: 'hvac',
      parts: [
        { type: 'red', title: 'Heating Element & Sensors', text: 'Critical thermal safety control, monitored for burnout cycles.' },
        { type: 'red', title: 'Compressor & Thermostat Bus', text: 'High-CapEx failure risk; captures OEM warranty eligibility.' },
        { type: 'white', title: 'Blower & Condenser Fan', text: 'Mechanical airflow system logged during semi-annual PM audits.' },
      ],
      lineage: [
        {
          date: '2026-03-20',
          part: 'Blower Motor Amperage Certified (2.8A)',
          oem: 'OEM-CAR-BLW48',
          findings: 'PM: blower motor amperage certified at 2.8A.',
          eventType: 'preventive_maintenance',
          techId: membershipMorales.id,
          woNumber: 1014,
          woTitle: 'HVAC semi-annual PM — Unit 402',
          partsCost: 0,
          laborMinutes: 45,
          isWarranty: false,
          resolution: 'no_fault_found',
        },
        {
          date: '2025-08-11',
          part: 'Run Capacitor 45/5 uF Replaced',
          oem: 'CAP-45-5-370V',
          findings: 'Run capacitor replaced. Standard service.',
          eventType: 'part_replacement',
          techId: membershipMorales.id,
          woNumber: 819,
          woTitle: 'HVAC run capacitor replacement — Unit 402',
          partsCost: 38,
          laborMinutes: 40,
          isWarranty: false,
          resolution: 'part_replaced',
        },
        {
          date: '2021-11-05',
          part: 'Initial Hardware Tag Minted & Bound',
          oem: 'NPID-SYSTEM',
          findings: 'Commissioned and bound to NP-1M4K9X23.',
          eventType: 'installation',
          techId: membershipMorales.id,
          partsCost: 0,
          laborMinutes: 30,
          isWarranty: false,
          resolution: 'fixed',
        },
      ],
    },
    {
      npid: 'NP-3W9Q5R71',
      categoryKey: 'washer',
      modelKey: 'Speed Queen:FF7005WN',
      serial: '250608914',
      serialConfidence: 'ocr',
      title: 'Speed Queen Commercial Front-Load Washer',
      room: 'Unit 402 · Laundry Closet',
      purchaseDate: '2025-06-10',
      installDate: '2025-06-22',
      warrantyExpiresOn: '2030-06-22',
      warrantySub: '5-Yr Commercial Warranty',
      cost: 1320,
      specTag: 'LAUNDRY SYSTEMS · SPEC 02',
      gps: '33.5092° N, 111.9783° W',
      description:
        'High-efficiency direct-drive commercial washing unit. Tracks water inlet valves, drain pump health, heater elements, and spin drum vibration.',
      schematicKey: 'washer',
      parts: [
        { type: 'red', title: 'Water Inlet Valve & Drain Pump', text: 'High flood-risk points; tracked for solenoid wear.' },
        { type: 'red', title: 'Internal Water Heater & Control Panel', text: 'Monitored for power surges and electronic logic faults.' },
        { type: 'white', title: 'Drive Motor & Outer Drum Casing', text: 'Structural balance and bearing integrity verification.' },
      ],
      lineage: [
        {
          date: '2026-05-14',
          part: 'Door Gasket Sanitization & Balance Test',
          oem: 'GSK-SQ-F70',
          findings: 'Turn audit: door gasket sanitized, balance test passed.',
          eventType: 'cleaning',
          techId: membershipVance.id,
          partsCost: 0,
          laborMinutes: 25,
          isWarranty: true,
          resolution: 'no_fault_found',
        },
        {
          date: '2025-06-22',
          part: 'Unit Upgrade Installed & Affixed NPID',
          oem: 'NPID-SYSTEM',
          findings: 'Commissioned Speed Queen washer in laundry closet.',
          eventType: 'installation',
          techId: membershipMorales.id,
          partsCost: 0,
          laborMinutes: 50,
          isWarranty: false,
          resolution: 'fixed',
        },
      ],
    },
    {
      npid: 'NP-7K2M4QX9',
      categoryKey: 'refrigerator',
      modelKey: 'Whirlpool:WRF535SWHZ',
      serial: 'W10874291',
      serialConfidence: 'ocr',
      title: 'Whirlpool 36" French Door Refrigerator',
      room: 'Unit 402 · Gourmet Kitchen (North Alcove)',
      purchaseDate: '2023-03-15',
      installDate: '2023-04-10',
      warrantyExpiresOn: '2028-04-10',
      warrantySub: '10-Yr Sealed System Warranty',
      cost: 1450,
      specTag: 'KITCHEN SYSTEMS · SPEC 03',
      gps: '33.5092° N, 111.9783° W',
      description:
        'Multi-zone refrigeration system with hermetic compressor and dual evaporator coils. Tracks compressor cycles, defrost cycles, and door seal integrity.',
      schematicKey: 'fridge',
      parts: [
        { type: 'red', title: 'Hermetic Sealed Compressor', text: 'Primary refrigeration power; core warranty recovery asset.' },
        { type: 'red', title: 'Evaporator Coils & Defrost Loop', text: 'Cold-wall freeze risk; tracked for refrigerant efficiency.' },
        { type: 'white', title: 'Thermostat & Magnetic Door Seals', text: 'Air-tight envelope monitoring preventing frost buildup.' },
      ],
      lineage: [
        {
          date: '2026-06-12',
          part: 'Defrost Bi-Metal Thermostat Replaced',
          oem: 'WPW10225581',
          findings: 'Defrost bi-metal thermostat replaced under OEM sealed-system coverage.',
          eventType: 'warranty_service',
          techId: membershipMorales.id,
          woNumber: 1048,
          woTitle: 'Refrigerator defrost thermostat — Unit 402',
          partsCost: 0,
          laborMinutes: 55,
          isWarranty: true,
          resolution: 'part_replaced',
        },
        {
          date: '2026-02-18',
          part: 'Make-Ready Turnover Audit & Seal Check',
          oem: 'SEAL-WP-FR535',
          findings: 'Turn audit: door seals verified present and seating.',
          eventType: 'inspection',
          techId: membershipVance.id,
          partsCost: 0,
          laborMinutes: 20,
          isWarranty: false,
          resolution: 'no_fault_found',
        },
        {
          date: '2024-11-04',
          part: 'Dual Water Inlet Solenoid Valve Swapped',
          oem: 'W10498990',
          findings: 'Replaced dual water inlet solenoid valve.',
          eventType: 'part_replacement',
          techId: membershipVance.id,
          woNumber: 612,
          woTitle: 'Refrigerator water inlet valve — Unit 402',
          partsCost: 38.5,
          laborMinutes: 35,
          isWarranty: false,
          resolution: 'part_replaced',
        },
        {
          date: '2023-04-10',
          part: 'Initial Tag Minted & Claimed in Unit 402',
          oem: 'NPID-SYSTEM',
          findings: 'Onboarded and claimed NP-7K2M4QX9.',
          eventType: 'installation',
          techId: membershipMorales.id,
          partsCost: 0,
          laborMinutes: 25,
          isWarranty: false,
          resolution: 'fixed',
        },
      ],
    },
    {
      npid: 'NP-6K8L2P44',
      categoryKey: 'dryer',
      modelKey: 'Speed Queen:DF7000WE',
      serial: '250609318',
      serialConfidence: 'ocr',
      title: 'Speed Queen Electric Heavy Duty Dryer',
      room: 'Unit 402 · Laundry Closet',
      purchaseDate: '2025-06-10',
      installDate: '2025-06-22',
      warrantyExpiresOn: '2030-06-22',
      warrantySub: '5-Yr Commercial Warranty',
      cost: 1250,
      specTag: 'LAUNDRY SYSTEMS · SPEC 04',
      gps: '33.5092° N, 111.9783° W',
      description:
        'Commercial electric drying unit. Tracks ceramic heating element, centrifugal blower fan, thermal cutoffs, and exhaust duct airflow backpressure.',
      schematicKey: 'dryer',
      parts: [
        { type: 'red', title: 'High-Density Heating Element', text: 'Critical fire-safety checkpoint; resistance certified at turns.' },
        { type: 'white', title: 'Centrifugal Exhaust Blower & Lint Screen', text: 'Airflow backpressure tested to prevent lint accumulation.' },
        { type: 'white', title: 'Drum Drive Belt & Idler Pulley', text: 'Mechanical rotation verified during make-ready turns.' },
      ],
      lineage: [
        {
          date: '2026-05-14',
          part: 'Exhaust Duct Airflow Certified 480 CFM',
          oem: 'DUCT-CFM-TEST',
          findings: 'Turn walk: exhaust duct airflow certified 480 CFM.',
          eventType: 'inspection',
          techId: membershipVance.id,
          partsCost: 0,
          laborMinutes: 20,
          isWarranty: true,
          resolution: 'no_fault_found',
        },
        {
          date: '2025-06-22',
          part: 'Unit Installed & Affixed NPID Hardware',
          oem: 'NPID-SYSTEM',
          findings: 'Commissioned dryer paired with washer in laundry closet.',
          eventType: 'installation',
          techId: membershipMorales.id,
          partsCost: 0,
          laborMinutes: 40,
          isWarranty: false,
          resolution: 'fixed',
        },
      ],
    },
    {
      npid: 'NP-8V3Z6K19',
      categoryKey: 'dishwasher',
      modelKey: 'GE:PDT715SYNFS',
      serial: '340918471',
      serialConfidence: 'scanned',
      title: 'GE Profile Top Control Dishwasher',
      room: 'Unit 402 · Gourmet Kitchen',
      purchaseDate: '2023-03-15',
      installDate: '2023-04-10',
      warrantyExpiresOn: '2028-04-10',
      warrantySub: '5-Yr Tub & Electronics Warranty',
      cost: 899,
      specTag: 'KITCHEN SYSTEMS · SPEC 05',
      gps: '33.5092° N, 111.9783° W',
      description:
        'High-pressure wash system with heating boost element, multi-tier spray arms, float switch flood protection, and dual detergent solenoid actuators.',
      schematicKey: 'dishwasher',
      parts: [
        { type: 'red', title: 'Internal Water Booster Heater', text: 'High-temperature sanitation verification.' },
        { type: 'white', title: 'Float Switch & Circulation Pump', text: 'Sub-floor leak mitigation sensors tested annually.' },
        { type: 'white', title: 'Upper/Lower Spray Arms & Racks', text: 'Mechanical wash integrity checked during turnover audits.' },
      ],
      lineage: [
        {
          date: '2026-01-09',
          part: 'Drain Pump Filter Cleared & Calibrated',
          oem: 'PUMP-GE-PDT7',
          findings: 'Drain pump filter cleared and calibrated.',
          eventType: 'part_replacement',
          techId: membershipVance.id,
          woNumber: 932,
          woTitle: 'Dishwasher drain pump service — Unit 402',
          partsCost: 24,
          laborMinutes: 30,
          isWarranty: false,
          resolution: 'fixed',
        },
        {
          date: '2023-04-10',
          part: 'Initial Tag Affixed & Claimed in Unit 402',
          oem: 'NPID-SYSTEM',
          findings: 'Onboarded dishwasher in gourmet kitchen.',
          eventType: 'installation',
          techId: membershipMorales.id,
          partsCost: 0,
          laborMinutes: 25,
          isWarranty: false,
          resolution: 'fixed',
        },
      ],
    },
    {
      npid: 'NP-2N7V9X65',
      categoryKey: 'thermostat',
      modelKey: 'Honeywell:RCHT9610WFW',
      serial: '00D02D63F18A',
      serialConfidence: 'scanned',
      title: 'Honeywell Home T9 Smart Environmental Thermostat',
      room: 'Unit 402 · Central Hallway',
      purchaseDate: '2024-02-01',
      installDate: '2024-02-18',
      warrantyExpiresOn: '2027-02-18',
      warrantySub: '3-Yr Honeywell Pro Warranty',
      cost: 180,
      specTag: 'CLIMATE & CONTROLS · SPEC 06',
      gps: '33.5092° N, 111.9783° W',
      description:
        'Solid-state digital climate control bus. Interfaces with HVAC 24V relay board, ambient temperature sensors, and multi-zone remote room pucks.',
      schematicKey: 'thermostat',
      parts: [
        { type: 'red', title: 'HVAC Relay Bus & Control Panel', text: '24V signaling protection against power surges.' },
        { type: 'white', title: 'Digital LCD Display & User Interface', text: 'Hardware status telemetry reporting.' },
        { type: 'white', title: 'Precision Temperature Sensor', text: 'Thermal calibration audit logged across seasons.' },
      ],
      lineage: [
        {
          date: '2024-02-18',
          part: 'Remote Room Sensor Paired & Commissioned',
          oem: 'RCHTSENSOR-V1',
          findings: 'Remote room sensor paired; T9 commissioned on HVAC bus.',
          eventType: 'installation',
          techId: membershipMorales.id,
          partsCost: 0,
          laborMinutes: 35,
          isWarranty: false,
          resolution: 'fixed',
        },
      ],
    },
    {
      npid: 'NP-5K9L1P88',
      categoryKey: 'microwave',
      modelKey: 'GE:PVM9005SJSS',
      serial: '81920481',
      serialConfidence: 'ocr',
      title: 'GE Profile Over-the-Range Microwave & Vent',
      room: 'Unit 402 · Gourmet Kitchen (Above Range)',
      purchaseDate: '2024-07-02',
      installDate: '2024-07-15',
      warrantyExpiresOn: '2029-07-15',
      warrantySub: '5-Yr Magnetron Tube Warranty',
      cost: 540,
      specTag: 'KITCHEN APPLIANCES · SPEC 07',
      gps: '33.5092° N, 111.9783° W',
      description:
        'High-voltage cavity heating and exhaust ventilation unit. Tracks magnetron tube emission, high-voltage diode transformer, waveguide, and safety door interlocks.',
      schematicKey: 'microwave',
      parts: [
        { type: 'red', title: 'Magnetron & High-Voltage Tube', text: 'Core microwave radiation generator.' },
        { type: 'white', title: 'Dual Interlock Safety Door Latches', text: 'Door closure sensor preventing open-door operation.' },
        { type: 'white', title: 'Waveguide Chamber & Exhaust Fan', text: 'Energy dissipation and kitchen grease ventilation.' },
      ],
      lineage: [
        {
          date: '2024-07-15',
          part: 'Initial Tag Affixed & Range Hood Paired',
          oem: 'NPID-SYSTEM',
          findings: 'Microwave/vent commissioned above range.',
          eventType: 'installation',
          techId: membershipMorales.id,
          partsCost: 0,
          laborMinutes: 30,
          isWarranty: false,
          resolution: 'fixed',
        },
      ],
    },
  ];

  for (const def of showcaseDefs) {
    const model = models[def.modelKey];
    const [manufacturer, modelNumber] = def.modelKey.split(':');
    const asset = await prisma.asset.create({
      data: {
        orgId: org.id,
        npid: def.npid,
        categoryId: categories[def.categoryKey].id,
        assetModelId: model?.id,
        manufacturerRaw: manufacturer,
        modelRaw: modelNumber,
        serialNumber: def.serial,
        serialConfidence: def.serialConfidence,
        currentLocationType: 'unit',
        currentUnitId: unit402.id,
        currentPropertyId: ridge.id,
        currentLocationSince: new Date(def.installDate),
        currentLocationConfirmedAt: daysAgo(12),
        status: 'active',
        condition: 'good',
        acquisitionType: 'new_purchase',
        installDate: new Date(def.installDate),
        installDateConfidence: 'known',
        manufactureDate: new Date(def.purchaseDate),
        manufactureDateSource: 'purchase_order',
        warrantyExpiresOn: new Date(def.warrantyExpiresOn),
        purchaseCost: def.cost,
        expectedLifeMonths: categoryDefs.find((c) => c.key === def.categoryKey)
          ?.defaultUsefulLifeMonths,
        notes: def.title,
        customFields: {
          schematicKey: def.schematicKey,
          specTag: def.specTag,
          room: def.room,
          gps: def.gps,
          owner: OWNER,
          warrantySub: def.warrantySub,
          description: def.description,
          serialLabel:
            def.serialConfidence === 'ocr' ? 'OCR Stamped' : 'Scanned Barcode',
          criticalParts: def.parts,
        },
      },
    });
    assets.push({ id: asset.id, npid: asset.npid, categoryKey: def.categoryKey });

    for (const row of def.lineage) {
      let workOrderId: string | undefined;
      if (row.woNumber) {
        const wo = await prisma.workOrder.create({
          data: {
            orgId: org.id,
            propertyId: ridge.id,
            number: row.woNumber,
            unitId: unit402.id,
            assetId: asset.id,
            title: row.woTitle ?? row.part,
            source: 'technician',
            priority: 'standard',
            status: 'completed',
            assignedTo: row.techId,
            requestedAction: 'repair',
            resolution: row.isWarranty ? 'no_fault_found' : 'repaired',
            completedAt: new Date(row.date),
            slaMet: true,
            actualCost: row.partsCost,
            occurredAt: new Date(row.date),
          },
        });
        workOrderId = wo.id;
      }

      await prisma.serviceEvent.create({
        data: {
          orgId: org.id,
          assetId: asset.id,
          workOrderId,
          unitId: unit402.id,
          propertyId: ridge.id,
          technicianId: row.techId,
          eventType: row.eventType,
          findings: `${row.part} · OEM ${row.oem}. ${row.findings}`,
          symptomCodes: [],
          resolutionCode: row.resolution,
          laborMinutes: row.laborMinutes,
          laborRate: 32,
          partsCost: row.partsCost,
          costBorneBy: row.isWarranty ? 'warranty' : 'owner',
          isWarrantyClaim: row.isWarranty,
          occurredAt: new Date(row.date),
        },
      });
    }
  }

  // Trailing-12-month spend series so HQ charts have a real curve.
  const eventTypes: Array<
    'repair' | 'inspection' | 'preventive_maintenance' | 'part_replacement'
  > = ['repair', 'inspection', 'preventive_maintenance', 'part_replacement'];
  let woSeq = 1100;
  for (let m = 0; m < 12; m++) {
    const count = 2 + (m % 3);
    for (let k = 0; k < count; k++) {
      const asset = assets[(m * 5 + k * 3) % assets.length];
      const unit = allUnits[(m * 2 + k) % allUnits.length];
      const partsCost = Math.round((18 + ((m * 17 + k * 13) % 160)) * 100) / 100;
      await prisma.serviceEvent.create({
        data: {
          orgId: org.id,
          assetId: asset.id,
          unitId: unit.id,
          propertyId: unit.propertyId,
          technicianId: k % 2 === 0 ? membershipTech1.id : membershipTech2.id,
          eventType: eventTypes[(m + k) % eventTypes.length],
          findings: 'Portfolio service visit (seeded T12 series).',
          symptomCodes: [],
          resolutionCode: 'fixed',
          laborMinutes: 20 + ((m * 7 + k * 5) % 50),
          laborRate: k % 2 === 0 ? 28.5 : 34,
          partsCost,
          costBorneBy: 'owner',
          occurredAt: daysAgo(m * 28 + k * 4 + 3),
        },
      });
      woSeq += 1;
    }
  }
  void woSeq;

  await prisma.$executeRawUnsafe(`
    UPDATE service_event
    SET
      labor_cost = ROUND((COALESCE(labor_minutes, 0) / 60.0) * COALESCE(labor_rate, 0), 2),
      total_cost = ROUND((COALESCE(labor_minutes, 0) / 60.0) * COALESCE(labor_rate, 0), 2)
                   + COALESCE(parts_cost, 0) + COALESCE(other_cost, 0)
  `);

  const allEvents = await prisma.serviceEvent.findMany({
    select: { assetId: true, totalCost: true, occurredAt: true },
  });
  const rollup = new Map<string, { cost: number; n: number; last: Date }>();
  for (const e of allEvents) {
    const cur = rollup.get(e.assetId) ?? { cost: 0, n: 0, last: e.occurredAt };
    cur.cost += Number(e.totalCost ?? 0);
    cur.n += 1;
    if (e.occurredAt > cur.last) cur.last = e.occurredAt;
    rollup.set(e.assetId, cur);
  }
  for (const [id, r] of rollup) {
    await prisma.asset.update({
      where: { id },
      data: {
        lifetimeServiceCost: Math.round(r.cost * 100) / 100,
        serviceEventCount: r.n,
        lastServiceAt: r.last,
      },
    });
  }

  console.log('Seed complete:');
  console.log(`  org: ${org.name} (${org.id})`);
  console.log(`  properties: ${properties.length}`);
  console.log(`  units: ${allUnits.length}`);
  console.log(`  assets: ${assets.length}`);
  console.log(`  showcase NPIDs: NP-1M4K9X23 … NP-5K9L1P88`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
