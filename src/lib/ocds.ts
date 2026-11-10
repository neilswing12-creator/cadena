import type { Award, Project } from "./db";

const PREFIX = "ocds-pisoscan";

/** OCDS 1.1 release for a PhilGEPS award (award stage only — the source has no tender or payment data). */
export function toOcdsRelease(a: Award, fingerprint: string) {
  const ocid = `${PREFIX}-pg-${a.id}`;
  return {
    ocid,
    id: `${ocid}-award`,
    date: a.award_date ? `${a.award_date}T00:00:00+08:00` : undefined,
    tag: ["award"],
    initiationType: "tender",
    language: "en",
    parties: [
      { id: `buyer-${a.agency_id}`, name: a.organization, roles: ["buyer", "procuringEntity"] },
      { id: `supplier-${a.contractor_id}`, name: a.awardee, roles: ["supplier"] },
    ],
    buyer: { id: `buyer-${a.agency_id}`, name: a.organization },
    tender: { id: a.reference || ocid, title: a.title, mainProcurementCategory: "works" },
    awards: [
      {
        id: a.reference || a.id,
        title: a.title,
        date: a.award_date ? `${a.award_date}T00:00:00+08:00` : undefined,
        status: "active",
        value: a.amount != null ? { amount: a.amount, currency: "PHP" } : undefined,
        suppliers: [{ id: `supplier-${a.contractor_id}`, name: a.awardee }],
        deliveryAddresses: a.area ? [{ region: a.area }] : undefined,
      },
    ],
    contracts: a.contract_no ? [{ id: a.contract_no, awardID: a.reference || a.id, status: "active" }] : undefined,
    source: { dataset: "Open PhilGEPS Data — BetterGov.ph (CC0 1.0)", sha256: fingerprint },
  };
}

/** OC4IDS project record for a DPWH contract. */
export function toOc4idsProject(p: Project, fingerprint: string, contractorName: string | null) {
  const status = /complete/i.test(p.status || "") ? "completed" : /going/i.test(p.status || "") ? "implementation" : /procure/i.test(p.status || "") ? "preparation" : /terminat/i.test(p.status || "") ? "cancelled" : "identification";
  return {
    id: `oc4ids-pisoscan-dpwh-${p.id}`,
    title: p.description,
    sector: [p.category],
    status,
    publicAuthority: { name: `DPWH ${p.office ?? ""}`.trim() },
    period: { startDate: p.start ?? undefined, endDate: p.end ?? undefined },
    budget: p.amount != null ? { amount: { amount: p.amount, currency: "PHP" } } : undefined,
    locations: p.lat != null && p.lng != null ? [{ geometry: { type: "Point", coordinates: [p.lng, p.lat] } }] : undefined,
    parties: contractorName ? [{ name: contractorName, roles: ["supplier"] }] : [],
    contractingProcesses: [{ id: p.id, summary: { title: p.description, status: status === "completed" ? "closed" : status === "cancelled" ? "cancelled" : "active", contractValue: p.amount != null ? { amount: p.amount, currency: "PHP" } : undefined } }],
    // Fields below are a PisoScan extension (not part of OC4IDS).
    pisoscan: { dpwhStatus: p.status, physicalProgressPercent: p.progress, fundingSource: p.funds, sourceDataset: "DPWH contract list via BetterGov.ph", sha256: fingerprint },
  };
}
