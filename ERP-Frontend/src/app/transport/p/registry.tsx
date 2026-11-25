import type { ReactNode } from "react";
import { renderPage as renderSchoolPage } from "../../school/s/registry";
import { BusAttendancePages } from "../../school/s/transport-pages3";
import { MyRequests, RaiseRequest } from "../../teacher/t/help-pages";
import { ComingUp, MonthView } from "../../teacher/t/cal-pages";
import { Claims, Payslips } from "../../teacher/t/profile-pages";
import { ExitClearance, Notifications, Overview, SentMessages, Settings } from "./dash-pages";
import { VehiclePage } from "./vehicle-pages";
import { ParentPage } from "./parent-pages";
import { FeePage } from "./money-pages";
import { MissedBoardings } from "./missed-page";
import { CrewPage } from "./crew-pages";
import { RoutePage } from "./route-pages";
import { PlannerPage } from "./planner-page";
import { AllocationPage } from "./allocation-pages";
import { AssignmentPage } from "./assignment-pages";
import { TripPage } from "./trip-pages";
import { TransportQuickActions } from "./quick";

type Go = (tab: string, extra?: Record<string, string>) => void;
/** What a link can pre-select: a route to show, a student to find or allocate. */
export interface Pick { route?: string; find?: string; student?: string }

/** Every tab of the Transport Dashboard starts with Quick actions and Recent pages. */
const dash = (key: string, page: ReactNode) => <div key={key}><TransportQuickActions />{page}</div>;
/** The screen for one page (tab) of one submenu. */
export function renderPage(module: string, section: string, page: string, go: Go, pick: Pick, school?: [string, string]): ReactNode {
  const k = `${module}/${section}/${page}`;
  switch (k) {
    case "dashboard/transport-dashboard/overview": return dash(k, <Overview />);
    case "dashboard/transport-dashboard/notifications": return dash(k, <Notifications />);
    case "dashboard/transport-dashboard/settings": return dash(k, <Settings />);
    case "dashboard/transport-dashboard/sent-messages": return dash(k, <SentMessages />);
    case "dashboard/transport-dashboard/staff-exit-clearance": return dash(k, <ExitClearance />);
    case "dashboard/my-claims/submit-a-claim": return <Claims key={k} view="submit" go={go} />;
    case "dashboard/my-claims/my-claims": return <Claims key={k} view="list" go={go} empty="No claims yet." />;
    case "dashboard/help-desk/raise-a-request": return <RaiseRequest key={k} example="One line, for example: GPS not updating for Route 4" />;
    case "dashboard/help-desk/my-requests": return <MyRequests key={k} go={go} />;
    case "dashboard/school-calendar/month-view": return <MonthView key={k} />;
    case "dashboard/school-calendar/coming-up": return <ComingUp key={k} />;
    case "mywork/my-payslips/payslips": return <Payslips key={k} />;
    case "vehicles/vehicles/fleet": return <VehiclePage key={k} tab="fleet" go={go} />;
    case "vehicles/vehicles/add-vehicle": return <VehiclePage key={k} tab="add-vehicle" go={go} />;
    case "vehicles/vehicles/documents": return <VehiclePage key={k} tab="documents" go={go} />;
    case "crew/drivers-and-attendants/drivers": return <CrewPage key={k} tab="drivers" go={go} />;
    case "crew/drivers-and-attendants/attendants": return <CrewPage key={k} tab="attendants" go={go} />;
    case "crew/drivers-and-attendants/register": return <CrewPage key={k} tab="register" go={go} />;
    case "routes/routes-and-stops/routes": return <RoutePage key={k} tab="routes" go={go} />;
    case "routes/routes-and-stops/stops": return <RoutePage key={k} tab="stops" go={go} route={pick.route} />;
    case "routes/routes-and-stops/add-route": return <RoutePage key={k} tab="add-route" go={go} />;
    case "routes/route-planner/plan-routes": return <PlannerPage key={k} />;
    case "timings/route-timings/timetable": return <RoutePage key={k} tab="timetable" go={go} />;
    case "timings/route-timings/stop-timings": return <RoutePage key={k} tab="stop-timings" go={go} />;
    case "allocation/student-allocation/assign-students": return <AllocationPage key={k} tab="assign-students" find={pick.find} student={pick.student} />;
    case "allocation/student-allocation/requests": return <AllocationPage key={k} tab="requests" />;
    case "allocation/student-allocation/parent-app-requests": return <AllocationPage key={k} tab="parent-app-requests" />;
    case "assignment/vehicle-driver-assignment/assignments": return <AssignmentPage key={k} tab="assignments" />;
    case "assignment/vehicle-driver-assignment/spare": return <AssignmentPage key={k} tab="spare" />;
    case "tracking/trip-tracking/live-trips": return <TripPage key={k} tab="live-trips" />;
    case "tracking/trip-tracking/vehicle-status": return <TripPage key={k} tab="vehicle-status" />;
    case "tracking/trip-tracking/trip-log": return <TripPage key={k} tab="trip-log" />;
    case "tracking/driver-app/todays-trip": return <TripPage key={k} tab="driver-app" />;
    case "parents/parent-updates/send-update": return <ParentPage key={k} tab="send-update" go={go} />;
    case "parents/parent-updates/sent-updates": return <ParentPage key={k} tab="sent-updates" go={go} />;
    case "parents/parent-updates/what-parents-see": return <ParentPage key={k} tab="what-parents-see" go={go} />;
    case "tracking/bus-attendance/trip-roster": return <BusAttendancePages key={k} tab="trip-roster" />;
    case "tracking/bus-attendance/missed-boardings": return <MissedBoardings key={k} />;
    case "fees/transport-fees/route-wise": return <FeePage key={k} tab="route-wise" go={go} />;
    case "fees/transport-fees/student-fees": return <FeePage key={k} tab="student-fees" go={go} route={pick.route} />;
  }
  return school ? renderSchoolPage(school[0], school[1], page) : null;
}
