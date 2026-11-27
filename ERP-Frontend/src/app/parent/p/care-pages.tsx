"use client";

import { Panel } from "@/components/admin/dash";
import { Head } from "../../teacher/t/head";
import { ChildBar, DataTable, Empty, Loaded, Note, Pairs, Status, Tiles, bold, dmy, inr, row, useChildPath, useGet } from "./kit";

/** School bus, health, library and mess for one child, as those teams record them. */
const Page = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (<><Head title={title} subtitle={subtitle} /><div className="space-y-4"><ChildBar />{children}</div></>);

interface Crew { name: string; mobile: string | null }
interface Bus {
  allocated: boolean; status: string; since: string; route: { name: string; area: string; at_school: string; departure: string }; stop: { name: string; pickup: string; drop: string } | null; stops: { name: string; pickup: string; drop: string; mine: boolean }[];
  vehicle: { name: string; reg_no: string; type: string } | null; driver: (Crew & { police: string }) | null; attendant: Crew | null; share_location: boolean; trips: { type: string; status: string; started: string; ended: string; delay: number; stops_done: number }[]; boardings: { date: string; type: string; status: string }[];
}
const useBus = () => useGet<Bus>(useChildPath("/parent/transport"));
const NO_BUS = "Your child is not using the school bus. To ask for it, raise a School bus change under Requests.";
const person = (p: Crew | null) => (p ? [p.name, p.mobile].filter(Boolean).join(" · ") : "Not assigned yet");

export function SchoolBus() {
  const r = useBus();
  return (
    <Page title="School Bus" subtitle="Route, stop, timings and today's trip.">
      <Loaded r={r}>{(b) => (!b.allocated ? <Empty>{NO_BUS}</Empty> : (
        <>
          {b.status !== "Active" && <Note tone="amber">A transport change is waiting with the transport office.</Note>}
          <Tiles items={[{ label: "Route", value: b.route.name, sub: b.route.area }, { label: "Pickup", value: b.stop?.pickup || "—", sub: b.stop?.name ?? "No stop chosen", tone: "green" }, { label: "Drop", value: b.stop?.drop || "—", sub: b.stop?.name ?? "" }]} />
          <Panel title="Bus and crew">
            <div className="p-4"><Pairs rows={[["Bus", b.vehicle ? [b.vehicle.name, b.vehicle.reg_no].filter(Boolean).join(" · ") : "Not assigned yet"], ["Driver", person(b.driver)], ["Attendant", person(b.attendant)], ["At school by", b.route.at_school], ["Leaves school", b.route.departure], ["Using since", dmy(b.since)]]} /></div>
          </Panel>
          <Panel title="Today's trips">
            {!b.share_location ? <p className="px-5 py-6 text-center text-[13px] text-slate-400">The school does not share trip progress.</p> : !b.trips.length ? <p className="px-5 py-6 text-center text-[13px] text-slate-400">No trip has started today.</p> : (
              <ul className="divide-y divide-slate-100">{b.trips.map((t) => <li key={t.type} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]"><b>{t.type}</b><Status value={t.status} /><span className="text-slate-600">{[t.started ? `started ${t.started}` : "", t.stops_done ? `${t.stops_done} stops reached` : "", t.delay ? `${t.delay} min late` : "", t.ended ? `ended ${t.ended}` : ""].filter(Boolean).join(" · ")}</span></li>)}</ul>
            )}
          </Panel>
          <DataTable title="Stops on this route" sub={`${b.stops.length} stops`} head={[{ h: "Stop" }, { h: "Pickup" }, { h: "Drop" }]} rows={b.stops.map((s) => row([s.name, s.pickup || "—", s.drop || "—"], [s.mine ? <span key="m" className="font-semibold text-[#026f9b]">{s.name} (your stop)</span> : s.name, s.pickup || "—", s.drop || "—"]))} />
        </>
      ))}</Loaded>
    </Page>
  );
}
export function Boarding() {
  const r = useBus();
  return (
    <Page title="Boarding History" subtitle="Whether your child boarded, as the bus crew marked it.">
      <Loaded r={r}>{(b) => (!b.allocated ? <Empty>{NO_BUS}</Empty> : <DataTable title="Boarding" sub={`${b.boardings.length} latest`} name="bus-boarding" head={[{ h: "Date" }, { h: "Trip" }, { h: "Status" }]} empty="Nothing marked yet." rows={b.boardings.map((x) => row([x.date, x.type, x.status], [bold(dmy(x.date)), x.type, <Status key="s" value={x.status} />]))} />)}</Loaded>
    </Page>
  );
}

interface Health {
  record: { blood_group: string; allergies: string; conditions: string; contact1_name: string; contact1_mobile: string; contact2_name: string; contact2_mobile: string } | null; blood_group: string;
  vaccines: { vaccine: string; status: string }[]; screenings: { id: string; screened_on: string; height_cm: number | null; weight_kg: number | null; vision: string; checkup: string; status: string }[];
  medicines: { id: string; medicine: string; dose_when: string; until: string; consent: boolean; status: string }[]; updates: { id: string; code: string; kind: string; details: string; sent_on: string; status: string }[];
}
const useHealth = () => useGet<Health>(useChildPath("/parent/health"));
export function HealthRecord() {
  const r = useHealth();
  return (
    <Page title="Health Record" subtitle="What the school nurse has on record. To correct or add to it, send a medical note under Requests.">
      <Loaded r={r}>{(h) => (
        <>
          <Panel title="Health and emergency contacts">
            <div className="p-4"><Pairs rows={[["Blood group", h.record?.blood_group || h.blood_group], ["Allergies", h.record ? h.record.allergies || "None recorded" : ""], ["Conditions", h.record ? h.record.conditions || "None recorded" : ""], ["Contact 1", [h.record?.contact1_name, h.record?.contact1_mobile].filter(Boolean).join(" · ")], ["Contact 2", [h.record?.contact2_name, h.record?.contact2_mobile].filter(Boolean).join(" · ")]]} /></div>
          </Panel>
          <DataTable title="Vaccinations" sub={`${h.vaccines.length} recorded`} head={[{ h: "Vaccine" }, { h: "Status" }]} empty="No vaccinations recorded." rows={h.vaccines.map((v) => row([v.vaccine, v.status], [bold(v.vaccine), <Status key="s" value={v.status} />]))} />
          <DataTable title="Medicines at school" sub={`${h.medicines.length} recorded`} head={[{ h: "Medicine" }, { h: "When" }, { h: "Until" }, { h: "Parent consent" }, { h: "Status" }]} empty="No medicine is given at school." rows={h.medicines.map((m) => row([m.medicine, m.dose_when, m.until, m.consent ? "On file" : "Not on file", m.status], [bold(m.medicine), m.dose_when, dmy(m.until), m.consent ? "On file" : "Not on file", <Status key="s" value={m.status} />]))} />
          <DataTable title="Sent by you" sub={`${h.updates.length} notes`} head={[{ h: "Number" }, { h: "Type" }, { h: "Details" }, { h: "Sent" }, { h: "Status" }]} empty="You have not sent a note." rows={h.updates.map((u) => row([u.code, u.kind, u.details, u.sent_on, u.status], [u.code, u.kind, u.details, dmy(u.sent_on), <Status key="s" value={u.status} />]))} />
        </>
      )}</Loaded>
    </Page>
  );
}
export function Checkups() {
  const r = useHealth();
  return (
    <Page title="Check-ups" subtitle="Results of the school health screenings.">
      <Loaded r={r}>{(h) => <DataTable title="Health screenings" sub={`${h.screenings.length} check-ups`} name="health-checkups" head={[{ h: "Date" }, { h: "Height (cm)" }, { h: "Weight (kg)" }, { h: "Vision" }, { h: "Check-up" }, { h: "Result" }]} empty="No check-up recorded yet." rows={h.screenings.map((s) => row([s.screened_on, s.height_cm ?? "—", s.weight_kg ?? "—", s.vision || "—", s.checkup || "—", s.status], [bold(dmy(s.screened_on)), s.height_cm ?? "—", s.weight_kg ?? "—", s.vision || "—", s.checkup || "—", <Status key="s" value={s.status} />]))} />}</Loaded>
    </Page>
  );
}

interface Lib { member: { code: string; valid_until: string; status: string } | null; issues: { id: string; title: string; author: string; accession: string; issued_on: string; due_on: string; returned_on: string; status: string }[]; reservations: { id: string; code: string; title: string; date: string; status: string }[]; fines: { id: string; code: string; reason: string; amount: number; fined_on: string; status: string }[] }
const useLib = () => useGet<Lib>(useChildPath("/parent/library"));
const NO_CARD = "Your child does not have a library card yet.";
export function Books() {
  const r = useLib();
  return (
    <Page title="Library Books" subtitle="Books with your child now and returned earlier.">
      <Loaded r={r}>{(d) => (!d.member ? <Empty>{NO_CARD}</Empty> : (
        <>
          <Tiles items={[{ label: "Library card", value: d.member.code, sub: `Valid until ${dmy(d.member.valid_until)}` }, { label: "With your child", value: d.issues.filter((i) => i.status === "Issued" || i.status === "Overdue").length, sub: "Books", tone: "green" }, { label: "Overdue", value: d.issues.filter((i) => i.status === "Overdue").length, sub: "Return soon", tone: "amber" }]} />
          <DataTable title="Books" sub={`${d.issues.length} issued`} name="library-books" search head={[{ h: "Book" }, { h: "Author" }, { h: "Issued" }, { h: "Due" }, { h: "Returned" }, { h: "Status" }]} empty="No books borrowed yet." rows={d.issues.map((i) => row([i.title, i.author, i.issued_on, i.due_on, i.returned_on || "—", i.status], [bold(i.title), i.author, dmy(i.issued_on), dmy(i.due_on), i.returned_on ? dmy(i.returned_on) : "—", <Status key="s" value={i.status} />]))} />
        </>
      ))}</Loaded>
    </Page>
  );
}
export function Fines() {
  const r = useLib();
  return (
    <Page title="Reservations & Fines" subtitle="Books on hold and any library fines. Fines are paid at the library.">
      <Loaded r={r}>{(d) => (!d.member ? <Empty>{NO_CARD}</Empty> : (
        <>
          <DataTable title="Reservations" sub={`${d.reservations.length} on record`} head={[{ h: "Number" }, { h: "Book" }, { h: "Reserved" }, { h: "Status" }]} empty="Nothing reserved." rows={d.reservations.map((x) => row([x.code, x.title, x.date, x.status], [x.code, bold(x.title), dmy(x.date), <Status key="s" value={x.status} />]))} />
          <DataTable title="Fines" sub={`${d.fines.length} on record`} name="library-fines" head={[{ h: "Number" }, { h: "Reason" }, { h: "Amount" }, { h: "Date" }, { h: "Status" }]} empty="No fines." rows={d.fines.map((x) => row([x.code, x.reason, x.amount, x.fined_on, x.status], [x.code, x.reason, inr(x.amount), dmy(x.fined_on), <Status key="s" value={x.status} />]))} />
        </>
      ))}</Loaded>
    </Page>
  );
}

interface Mess { plan: { meals: string; diet: string; since: string; per_month: number | null; allergy: string } | null; menu: { day: number; breakfast: string; lunch: string; snacks: string; dinner: string }[]; requests: { id: string; code: string; meals: string; diet: string; start_on: string | null; requested_on: string; status: string }[] }
const useMess = () => useGet<Mess>(useChildPath("/parent/mess"));
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function MealPlan() {
  const r = useMess();
  return (
    <Page title="Meal Plan" subtitle="Your child's meals at school. To start meals, raise a Mess request under Requests.">
      <Loaded r={r}>{(m) => (
        <>
          <Panel title="Current plan">
            {m.plan ? <div className="p-4"><Pairs rows={[["Meals", m.plan.meals], ["Food preference", m.plan.diet], ["Since", dmy(m.plan.since)], ["Per month", m.plan.per_month ? inr(m.plan.per_month) : ""], ["Allergy noted", m.plan.allergy || "None"]]} /></div> : <p className="px-5 py-8 text-center text-[13px] text-slate-400">Your child has not opted for mess meals.</p>}
          </Panel>
          <DataTable title="Mess requests" sub={`${m.requests.length} requests`} head={[{ h: "Number" }, { h: "Meals" }, { h: "Preference" }, { h: "Start" }, { h: "Status" }]} empty="No requests." rows={m.requests.map((x) => row([x.code, x.meals, x.diet, x.start_on ?? "—", x.status], [x.code, x.meals, x.diet, dmy(x.start_on), <Status key="s" value={x.status} />]))} />
        </>
      )}</Loaded>
    </Page>
  );
}
export function Menu() {
  const r = useMess();
  return (
    <Page title="Weekly Menu" subtitle="What the mess serves each day.">
      <Loaded r={r}>{(m) => <DataTable title="Weekly menu" name="mess-menu" head={[{ h: "Day" }, { h: "Breakfast" }, { h: "Lunch" }, { h: "Snacks" }, { h: "Dinner" }]} empty="The menu has not been published yet." rows={m.menu.map((d) => row([DAYS[d.day] ?? String(d.day), d.breakfast || "—", d.lunch || "—", d.snacks || "—", d.dinner || "—"], [bold(DAYS[d.day] ?? d.day), d.breakfast || "—", d.lunch || "—", d.snacks || "—", d.dinner || "—"]))} />}</Loaded>
    </Page>
  );
}
