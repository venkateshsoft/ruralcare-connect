'use client';

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Role = "Practice Administrator" | "Physician" | "Nurse" | "Care Coordinator" | "Referral Partner" | "System Administrator";
type Module = "Dashboard" | "Patients" | "Care Coordination" | "Referrals" | "Chronic Care" | "Patient Engagement" | "Financial Health" | "Analytics" | "Administration" | "Audit History";
type Patient = { id: string; externalId: string; name: string; initials: string; age: number; zip: string; conditions: string[]; risk: string; last: string; next: string; gaps: number; referral: string; coordinator: string; balance: number; phone: string; email?: string; preferredChannel: string; consent: boolean };
type Task = { id: string; externalId: string; title: string; patient: string; patientId: string; category: string; priority: string; assignee: string; assigneeId: string; dueDate: string; status: string; description?: string };
type Referral = { id: string; externalId: string; patient: string; patientId: string; specialty: string; reason: string; status: string; priority: string; updated: string; owner: string; notes?: string };
type CarePlan = { id: string; condition: string; status: string; reviewDate: string; goals: string[]; activities: string[]; patient: string; patientId: string };
type Communication = { id: string; channel: string; template: string; status: string; content: string; patient: string; patientId: string; createdAt: string };
type Transaction = { id: string; kind: string; amount: number; status: string; reference: string; patient: string; patientId: string; createdAt: string };
type Activity = { id: string; action: string; detail: string; time: string; tone: string };
type DemoUser = { id: string; name: string; role: string };
type FormKind = "patient" | "task" | "referral" | "carePlan" | "communication" | "payment";
type DialogState = { kind: FormKind; record?: any; patientId?: string } | null;

const modules: Module[] = ["Dashboard", "Patients", "Care Coordination", "Referrals", "Chronic Care", "Patient Engagement", "Financial Health", "Analytics", "Administration", "Audit History"];
const roles: Role[] = ["Practice Administrator", "Physician", "Nurse", "Care Coordinator", "Referral Partner", "System Administrator"];
const moduleIcon: Record<Module, string> = { Dashboard: "⌂", Patients: "◉", "Care Coordination": "✓", Referrals: "↗", "Chronic Care": "♡", "Patient Engagement": "✉", "Financial Health": "$", Analytics: "▥", Administration: "⚙", "Audit History": "◷" };

function listValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || !value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : [value]; } catch { return value.split(",").map((x) => x.trim()).filter(Boolean); }
}
function dateLabel(value?: string | Date | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}
function dateInput(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function mapPatient(p: any): Patient {
  return {
    id: p.id, externalId: p.externalId, name: p.name, initials: p.initials || p.name.split(" ").map((part: string) => part[0]).join(""),
    age: p.age, zip: p.zip, phone: p.phone, email: p.email || "", conditions: listValue(p.conditions), risk: p.risk,
    last: p.lastEncounter || "Not seen", next: p.nextAppointment || "Not scheduled",
    gaps: p.carePlans?.filter((plan: any) => plan.status !== "Completed").length || 0,
    referral: p.referrals?.[0] ? p.referrals[0].specialty + " · " + p.referrals[0].status : "None",
    coordinator: p.tasks?.[0]?.assignee?.name || "Unassigned", balance: Number(p.balance || 0),
    preferredChannel: p.preferredChannel || "SMS", consent: p.consent !== false
  };
}
function mapTask(t: any): Task {
  return { id: t.id, externalId: t.externalId, title: t.title, patient: t.patient?.name || "Patient", patientId: t.patientId, category: t.category, priority: t.priority, assignee: t.assignee?.name || "Unassigned", assigneeId: t.assigneeId || "", dueDate: t.dueDate || "", status: t.status, description: t.description || "" };
}
function mapReferral(r: any): Referral {
  return { id: r.id, externalId: r.externalId, patient: r.patient?.name || "Patient", patientId: r.patientId, specialty: r.specialty, reason: r.reason, status: r.status, priority: r.priority, updated: dateLabel(r.updatedAt), owner: r.owner, notes: r.notes || "" };
}
function mapPlan(p: any): CarePlan {
  return { id: p.id, condition: p.condition, status: p.status, reviewDate: p.reviewDate || "", goals: listValue(p.goals), activities: listValue(p.activities), patient: p.patient?.name || "Patient", patientId: p.patientId };
}
function mapCommunication(c: any): Communication {
  return { id: c.id, channel: c.channel, template: c.template, status: c.status, content: c.content, patient: c.patient?.name || "Patient", patientId: c.patientId, createdAt: c.createdAt };
}
function mapTransaction(t: any): Transaction {
  return { id: t.id, kind: t.kind, amount: Number(t.amount), status: t.status, reference: t.reference, patient: t.patient?.name || "Patient", patientId: t.patientId, createdAt: t.createdAt };
}
function mapActivity(a: any): Activity {
  const action = a.action || "Activity";
  return { id: a.id, action, detail: a.detail, time: dateLabel(a.createdAt), tone: action.toLowerCase().includes("task") ? "blue" : action.toLowerCase().includes("referral") ? "purple" : "yellow" };
}
function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={"pill " + tone}>{children}</span>;
}
function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export default function Home() {
  const [role, setRole] = useState<Role>("Practice Administrator");
  const [active, setActive] = useState<Module>("Dashboard");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [taskFilter, setTaskFilter] = useState("All");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [saving, setSaving] = useState(false);

  const notify = (message: string) => setToast(message);
  const api = async (url: string, method = "GET", body?: unknown): Promise<any> => {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || ("Request failed (" + response.status + ")"));
    return payload;
  };
  const refreshData = async () => {
    const data = await api("/api/bootstrap");
    const nextPlans = (data.carePlans || []).map(mapPlan);
    const nextReferrals = (data.referrals || []).map(mapReferral);
    const nextPatients = (data.patients || []).map(mapPatient);
    for (const patient of nextPatients) {
      patient.gaps = nextPlans.filter((plan: CarePlan) => plan.patientId === patient.id && plan.status !== "Completed").length;
      const ref = nextReferrals.find((item: Referral) => item.patientId === patient.id);
      patient.referral = ref ? ref.specialty + " · " + ref.status : "None";
    }
    setPatients(nextPatients);
    setTasks((data.tasks || []).map(mapTask));
    setReferrals(nextReferrals);
    setCarePlans(nextPlans);
    setCommunications((data.communications || []).map(mapCommunication));
    setTransactions((data.transactions || []).map(mapTransaction));
    setActivity((data.activity || []).map(mapActivity));
    setUsers(data.users || []);
    setLoadError("");
  };

  useEffect(() => {
    refreshData().catch((error) => setLoadError(error.message || "Unable to load the database. Check DATABASE_URL and the deployment logs.")).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredPatients = useMemo(() => patients.filter((patient) => (patient.name + " " + patient.externalId + " " + patient.conditions.join(" ")).toLowerCase().includes(query.toLowerCase())), [patients, query]);
  const highRisk = patients.filter((patient) => patient.risk === "High").length;
  const overdue = tasks.filter((task) => task.status !== "Completed" && ((task.dueDate && new Date(task.dueDate) < new Date()) || task.status === "New")).length;
  const openRefs = referrals.filter((referral) => !["Closed", "Feedback Received"].includes(referral.status)).length;
  const totalBalance = patients.reduce((sum, patient) => sum + patient.balance, 0);

  const openDialog = (kind: FormKind, record?: any, patientId?: string) => setDialog({ kind, record, patientId });
  const deleteRecord = async (kind: string, id: string, label: string) => {
    if (!window.confirm("Delete " + label + "? This also removes related child records where applicable.")) return;
    const endpoints: Record<string, string> = { patient: "patients", task: "tasks", referral: "referrals", carePlan: "care-plans", communication: "communications", payment: "financial-transactions" };
    try {
      await api("/api/" + endpoints[kind] + "/" + id, "DELETE");
      if (selectedPatient?.id === id) setSelectedPatient(null);
      await refreshData();
      notify(label + " deleted");
    } catch (error: any) { notify(error.message || "Delete failed"); }
  };

  const saveDialog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dialog) return;
    setSaving(true);
    const values = new FormData(event.currentTarget);
    const value = (key: string) => String(values.get(key) ?? "").trim();
    const split = (key: string) => value(key).split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
    const editing = Boolean(dialog.record?.id);
    const id = dialog.record?.id;
    let endpoint = "";
    let payload: Record<string, any> = {};
    try {
      if (dialog.kind === "patient") {
        endpoint = "/api/patients";
        payload = {
          name: value("name"), age: Number(value("age")), zip: value("zip"), phone: value("phone"),
          email: value("email"), conditions: split("conditions"), risk: value("risk"),
          preferredChannel: value("preferredChannel"), consent: values.get("consent") === "on",
          balance: Number(value("balance") || 0), lastEncounter: value("lastEncounter"), nextAppointment: value("nextAppointment")
        };
      } else if (dialog.kind === "task") {
        endpoint = "/api/tasks";
        payload = { title: value("title"), patientId: value("patientId"), category: value("category"), priority: value("priority"), assigneeId: value("assigneeId") || null, dueDate: value("dueDate") || undefined, description: value("description") };
        if (editing) payload.status = value("status");
      } else if (dialog.kind === "referral") {
        endpoint = "/api/referrals";
        payload = { patientId: value("patientId"), specialty: value("specialty"), reason: value("reason"), priority: value("priority"), owner: value("owner"), notes: value("notes") };
        if (editing) payload.status = value("status");
      } else if (dialog.kind === "carePlan") {
        endpoint = "/api/care-plans";
        payload = { patientId: value("patientId"), condition: value("condition"), goals: split("goals"), activities: split("activities"), reviewDate: value("reviewDate") || undefined };
        if (editing) payload.status = value("status");
      } else if (dialog.kind === "communication") {
        endpoint = "/api/communications";
        payload = { patientId: value("patientId"), channel: value("channel"), template: value("template"), content: value("content") };
        if (editing) payload.status = value("status");
      } else if (dialog.kind === "payment") {
        endpoint = "/api/financial-transactions";
        payload = { patientId: value("patientId"), amount: Number(value("amount")), kind: "Payment", reference: value("reference") || "DEMO-" + Date.now() };
      }
      await api(editing ? endpoint + "/" + id : endpoint, editing ? "PATCH" : "POST", payload);
      setDialog(null);
      setSelectedPatient(null);
      await refreshData();
      notify(editing ? "Changes saved to the database" : "Record created and saved to the database");
    } catch (error: any) {
      notify(error.message || "Could not save this record");
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async (task: Task) => {
    try {
      await api("/api/tasks/" + task.id, "PATCH", { status: "Completed" });
      await refreshData();
      notify("Task completed and saved");
    } catch (error: any) { notify(error.message || "Could not update task"); }
  };
  const advanceReferral = async (referral: Referral) => {
    const stages = ["Draft", "Sent", "Received", "Appointment Scheduled", "Appointment Completed", "Feedback Received"];
    const next = stages[Math.max(0, stages.indexOf(referral.status) + 1)] || "Closed";
    try {
      await api("/api/referrals/" + referral.id, "PATCH", { status: next });
      await refreshData();
      notify("Referral moved to " + next);
    } catch (error: any) { notify(error.message || "Could not update referral"); }
  };
  const resetDemo = async () => {
    if (!window.confirm("Restore the synthetic demo dataset? This will replace records currently in this demo database.")) return;
    try {
      await api("/api/demo/reset", "POST", {});
      await refreshData();
      notify("Synthetic demo data restored");
    } catch (error: any) { notify(error.message || "Could not reset demo data"); }
  };
  const updateTransaction = async (transaction: Transaction, status: string) => {
    try {
      await api("/api/financial-transactions/" + transaction.id, "PATCH", { status });
      await refreshData();
      notify("Payment status changed to " + status);
    } catch (error: any) { notify(error.message || "Could not update payment"); }
  };

  const renderPatientRows = (rows: Patient[]) => rows.map((patient) => (
    <tr key={patient.id}>
      <td><button className="table-link" onClick={() => setSelectedPatient(patient)}><strong>{patient.name}</strong><small>{patient.externalId} · Age {patient.age} · {patient.zip}</small></button></td>
      <td><Pill tone={patient.risk.toLowerCase()}>{patient.risk}</Pill></td>
      <td>{patient.conditions.join(", ")}</td>
      <td>{patient.last}</td>
      <td>{patient.next === "Overdue" ? <Pill tone="high">{patient.gaps} open care plans</Pill> : patient.next}</td>
      <td>{patient.referral}</td>
      <td><button className="small-action" disabled={!patient.consent} onClick={() => openDialog("communication", undefined, patient.id)}>Message</button></td>
    </tr>
  ));

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">✦</div><div><strong>RuralCare</strong><span>CONNECT</span></div></div>
      <div className="practice-switch"><span className="status-dot" /> Montana Rural Health <span className="chevron">⌄</span></div>
      <nav>{modules.map((module) => <button key={module} className={active === module ? "nav-item active" : "nav-item"} onClick={() => setActive(module)}><span className="nav-icon">{moduleIcon[module]}</span>{module}{module === "Care Coordination" && <em>{overdue}</em>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="sync"><span className="sync-dot" /> Database connected<br /><small>{loading ? "Loading records…" : patients.length + " synthetic patients loaded"}</small></div>
        <button className="reset-link" onClick={resetDemo}>↻ Reset demo data</button>
        <div className="user-card"><div className="avatar purple">PA</div><div><strong>Priya Anand</strong><small>{role}</small></div><span>⋮</span></div>
      </div>
    </aside>
    <section className="workspace">
      <header className="topbar">
        <div className="global-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patients, tasks, referrals…" /><kbd>⌘ K</kbd></div>
        <div className="top-actions"><div className="role-select"><label>Demo role</label><select value={role} onChange={(event) => setRole(event.target.value as Role)}>{roles.map((item) => <option key={item}>{item}</option>)}</select></div></div>
      </header>
      <div className="content">
        {loadError && <section className="panel error-panel"><strong>Database connection failed</strong><p>{loadError}</p><button className="secondary-button" onClick={() => { setLoading(true); refreshData().catch((error) => setLoadError(error.message)).finally(() => setLoading(false)); }}>Retry connection</button></section>}
        {loading && <section className="panel"><p>Connecting to the RuralCare Connect database and loading synthetic demo records…</p></section>}

        {!loading && !loadError && active === "Dashboard" && <>
          <PageTitle eyebrow="Practice operations" title="Good morning, Priya" description="A live view of patient access, care coordination and practice activity." action={<button className="primary-button" onClick={() => openDialog("task")}>＋ Create task</button>} />
          <div className="stat-grid">
            <div className="stat-card purple"><div className="stat-top"><span>Patients in registry</span><b>◉</b></div><strong>{patients.length}</strong><small>Persisted records</small></div>
            <div className="stat-card pink"><div className="stat-top"><span>High-risk patients</span><b>⌁</b></div><strong>{highRisk}</strong><small>Require closer follow-up</small></div>
            <div className="stat-card blue"><div className="stat-top"><span>Open referrals</span><b>↗</b></div><strong>{openRefs}</strong><small>Closed-loop workflow</small></div>
            <div className="stat-card yellow"><div className="stat-top"><span>Open tasks</span><b>✓</b></div><strong>{tasks.filter((item) => item.status !== "Completed").length}</strong><small>{overdue} need attention</small></div>
          </div>
          <div className="dashboard-grid">
            <section className="panel"><div className="panel-heading"><div><h2>Priority patients</h2><p>Click a patient to open Patient 360</p></div><button className="link-button" onClick={() => setActive("Patients")}>All patients →</button></div>
              <table className="wide-table"><thead><tr><th>Patient</th><th>Risk</th><th>Conditions</th><th>Balance</th><th>Action</th></tr></thead><tbody>{patients.filter((item) => item.risk === "High").slice(0, 5).map((patient) => <tr key={patient.id}><td><button className="table-link" onClick={() => setSelectedPatient(patient)}><strong>{patient.name}</strong><small>{patient.externalId} · Age {patient.age}</small></button></td><td><Pill tone="high">High</Pill></td><td>{patient.conditions.join(", ")}</td><td>{"$" + patient.balance.toFixed(2)}</td><td><button className="small-action" onClick={() => openDialog("task", undefined, patient.id)}>Create task</button></td></tr>)}</tbody></table>
            </section>
            <section className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Persisted audit trail</p></div><button className="link-button" onClick={() => setActive("Audit History")}>View audit →</button></div>
              <div className="activity-list">{activity.slice(0, 7).map((item) => <div className="activity" key={item.id}><div className={"activity-icon " + item.tone}>✦</div><div><strong>{item.action}</strong><span>{item.detail}</span><small>{item.time}</small></div></div>)}{activity.length === 0 && <p>No activity recorded yet.</p>}</div>
            </section>
          </div>
          <section className="panel task-panel"><div className="panel-heading"><div><h2>Care team queue</h2><p>Complete, edit or delete tasks; all changes are saved to PostgreSQL.</p></div><button className="primary-button" onClick={() => openDialog("task")}>＋ Create task</button></div>
            <table className="wide-table"><thead><tr><th>Task</th><th>Patient</th><th>Priority</th><th>Assignee</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead><tbody>{tasks.slice(0, 8).map((task) => <tr key={task.id}><td><strong>{task.title}</strong><small>{task.externalId} · {task.category}</small></td><td>{task.patient}</td><td><Pill tone={task.priority.toLowerCase()}>{task.priority}</Pill></td><td>{task.assignee}</td><td>{dateLabel(task.dueDate)}</td><td><Pill tone="blue">{task.status}</Pill></td><td><button className="small-action" onClick={() => openDialog("task", task)}>Edit</button> {task.status !== "Completed" && <button className="small-action" onClick={() => completeTask(task)}>Complete</button>}</td></tr>)}</tbody></table>
          </section>
        </>}

        {!loading && !loadError && active === "Patients" && <>
          <PageTitle eyebrow="Patient registry" title="Patients" description="Create, search, edit and remove synthetic patient records." action={<button className="primary-button" onClick={() => openDialog("patient")}>＋ Add patient</button>} />
          <section className="panel"><div className="table-summary"><span>{filteredPatients.length} patients shown · changes persist in database</span><button className="link-button" onClick={() => openDialog("patient")}>＋ Add new</button></div>
            <table className="wide-table"><thead><tr><th>Patient</th><th>Risk</th><th>Conditions</th><th>Last encounter</th><th>Next appointment</th><th>Referral</th><th>Outreach</th></tr></thead><tbody>{renderPatientRows(filteredPatients)}</tbody></table>
          </section>
        </>}

        {!loading && !loadError && active === "Care Coordination" && <>
          <PageTitle eyebrow="Care operations" title="Care team work queue" description="Manage ownership, due dates, priority and workflow status." action={<button className="primary-button" onClick={() => openDialog("task")}>＋ Create task</button>} />
          <div className="queue-tabs">{["All", "New", "Assigned", "In Progress", "Waiting for Specialist", "Completed"].map((status) => <button className={taskFilter === status ? "selected" : ""} key={status} onClick={() => setTaskFilter(status)}>{status}<span>{status === "All" ? tasks.length : tasks.filter((task) => task.status === status).length}</span></button>)}</div>
          <section className="panel"><table className="wide-table"><thead><tr><th>Task</th><th>Patient</th><th>Priority</th><th>Assignee</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{tasks.filter((task) => taskFilter === "All" || task.status === taskFilter).map((task) => <tr key={task.id}><td><strong>{task.title}</strong><small>{task.externalId} · {task.category}</small></td><td>{task.patient}</td><td><Pill tone={task.priority.toLowerCase()}>{task.priority}</Pill></td><td>{task.assignee}</td><td>{dateLabel(task.dueDate)}</td><td><Pill tone="blue">{task.status}</Pill></td><td><button className="small-action" onClick={() => openDialog("task", task)}>Edit</button> {task.status !== "Completed" && <button className="small-action" onClick={() => completeTask(task)}>Complete</button>} <button className="small-action danger-action" onClick={() => deleteRecord("task", task.id, "task")}>Delete</button></td></tr>)}</tbody></table></section>
        </>}

        {!loading && !loadError && active === "Referrals" && <>
          <PageTitle eyebrow="Closed-loop coordination" title="Referrals" description="Create and follow each referral from draft to specialist feedback." action={<button className="primary-button" onClick={() => openDialog("referral")}>＋ New referral</button>} />
          <div className="referral-summary"><div><span>Open referrals</span><strong>{openRefs}</strong></div><div><span>Awaiting feedback</span><strong>{referrals.filter((item) => item.status === "Sent" || item.status === "Received").length}</strong></div><div><span>Appointment scheduled</span><strong>{referrals.filter((item) => item.status === "Appointment Scheduled").length}</strong></div><div><span>Feedback received</span><strong>{referrals.filter((item) => item.status === "Feedback Received").length}</strong></div></div>
          <section className="panel"><table className="wide-table"><thead><tr><th>Referral</th><th>Specialty</th><th>Reason</th><th>Status</th><th>Priority</th><th>Owner</th><th>Actions</th></tr></thead><tbody>{referrals.map((referral) => <tr key={referral.id}><td><strong>{referral.patient}</strong><small>{referral.externalId}</small></td><td>{referral.specialty}</td><td>{referral.reason}</td><td><Pill tone={referral.status.includes("Feedback") ? "green" : referral.status.includes("Unreachable") ? "high" : "blue"}>{referral.status}</Pill></td><td>{referral.priority}</td><td>{referral.owner}</td><td><button className="small-action" onClick={() => advanceReferral(referral)}>Advance</button> <button className="small-action" onClick={() => openDialog("referral", referral)}>Edit</button> <button className="small-action danger-action" onClick={() => deleteRecord("referral", referral.id, "referral")}>Delete</button></td></tr>)}</tbody></table></section>
        </>}

        {!loading && !loadError && active === "Chronic Care" && <>
          <PageTitle eyebrow="Clinical continuity" title="Chronic care plans" description="Create, review and update care plans for synthetic chronic-care workflows." action={<button className="primary-button" onClick={() => openDialog("carePlan")}>＋ Create care plan</button>} />
          <div className="care-cards">{["Diabetes", "Hypertension", "Cardiovascular disease", "Behavioral health"].map((condition, index) => <div className="care-card" key={condition}><div className="care-symbol">{["◒", "⌁", "♡", "✦"][index]}</div><span>{condition}</span><strong>{carePlans.filter((plan) => plan.condition.toLowerCase().includes(condition.toLowerCase().split(" ")[0]) && plan.status === "Active").length}</strong><small>active care plans</small></div>)}</div>
          <section className="panel"><div className="table-summary"><span>{carePlans.length} care plans</span><button className="link-button" onClick={() => openDialog("carePlan")}>＋ Add care plan</button></div><table className="wide-table"><thead><tr><th>Patient</th><th>Condition</th><th>Goals</th><th>Activities</th><th>Review date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{carePlans.map((plan) => <tr key={plan.id}><td>{plan.patient}</td><td><strong>{plan.condition}</strong></td><td>{plan.goals.join("; ")}</td><td>{plan.activities.join("; ")}</td><td>{dateLabel(plan.reviewDate)}</td><td><Pill tone={plan.status === "Active" ? "green" : "neutral"}>{plan.status}</Pill></td><td><button className="small-action" onClick={() => openDialog("carePlan", plan)}>Edit</button> {plan.status === "Active" && <button className="small-action" onClick={() => api("/api/care-plans/" + plan.id, "PATCH", { status: "Completed" }).then(refreshData).then(() => notify("Care plan completed")).catch((error) => notify(error.message))}>Complete</button>} <button className="small-action danger-action" onClick={() => deleteRecord("carePlan", plan.id, "care plan")}>Delete</button></td></tr>)}</tbody></table></section>
        </>}

        {!loading && !loadError && active === "Patient Engagement" && <>
          <PageTitle eyebrow="Patient connection" title="Patient engagement" description="Compose simulated SMS or voice outreach and review saved communication history." action={<button className="primary-button" onClick={() => openDialog("communication")}>＋ Compose message</button>} />
          <div className="engagement-top"><div className="metric-block"><span>Messages stored</span><strong>{communications.length}</strong><small>Database records</small></div><div className="metric-block"><span>SMS</span><strong>{communications.filter((item) => item.channel === "SMS").length}</strong><small>Simulated messages</small></div><div className="metric-block"><span>Voice</span><strong>{communications.filter((item) => item.channel === "Voice").length}</strong><small>Simulated calls</small></div><div className="metric-block"><span>Failed</span><strong>{communications.filter((item) => item.status === "Failed").length}</strong><small>Need review</small></div></div>
          <section className="panel"><div className="panel-heading"><div><h2>Outreach by patient</h2><p>Use Message to open a preselected composer</p></div></div><table className="wide-table"><thead><tr><th>Patient</th><th>Preferred channel</th><th>Consent</th><th>Action</th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.id}><td><strong>{patient.name}</strong><small>{patient.phone}</small></td><td>{patient.preferredChannel}</td><td><Pill tone={patient.consent ? "green" : "high"}>{patient.consent ? "Granted" : "Not recorded"}</Pill></td><td><button className="small-action" disabled={!patient.consent} onClick={() => openDialog("communication", undefined, patient.id)}>Compose message</button></td></tr>)}</tbody></table></section>
          <section className="panel"><div className="panel-heading"><div><h2>Communication history</h2><p>All entries below are simulated and persisted</p></div></div><table className="wide-table"><thead><tr><th>Patient</th><th>Channel</th><th>Template</th><th>Content</th><th>Status</th><th>Actions</th></tr></thead><tbody>{communications.map((item) => <tr key={item.id}><td>{item.patient}</td><td>{item.channel}</td><td>{item.template}</td><td>{item.content}</td><td><Pill tone={item.status === "Sent" || item.status === "Delivered" ? "green" : "neutral"}>{item.status}</Pill></td><td><button className="small-action" onClick={() => openDialog("communication", item)}>Edit</button> <button className="small-action danger-action" onClick={() => deleteRecord("communication", item.id, "communication")}>Delete</button></td></tr>)}</tbody></table></section>
        </>}

        {!loading && !loadError && active === "Financial Health" && <>
          <PageTitle eyebrow="Practice sustainability" title="Financial health" description="Record simulated payments, track patient balances and reverse posted transactions." action={<button className="primary-button" onClick={() => openDialog("payment")}>＋ Record payment</button>} />
          <div className="finance-grid"><div className="finance-card purple-bg"><span>Outstanding patient balances</span><strong>{"$" + totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong><small>Across {patients.filter((patient) => patient.balance > 0).length} patients</small><div className="finance-orb">$</div></div><div className="finance-card"><span>Payments recorded</span><strong>{transactions.length}</strong><small>Persisted simulated transactions</small></div><div className="finance-card"><span>Posted payments</span><strong>{transactions.filter((item) => item.status === "Posted").length}</strong><small>Balances recalculated</small></div></div>
          <section className="panel"><div className="panel-heading"><div><h2>Patient responsibility</h2><p>Outstanding balance and payment entry</p></div></div><table className="wide-table"><thead><tr><th>Patient</th><th>Balance</th><th>Risk</th><th>Action</th></tr></thead><tbody>{patients.filter((patient) => patient.balance > 0).map((patient) => <tr key={patient.id}><td><strong>{patient.name}</strong><small>{patient.externalId}</small></td><td><strong>{"$" + patient.balance.toFixed(2)}</strong></td><td><Pill tone={patient.balance > 300 ? "high" : "yellow"}>{patient.balance > 300 ? "Follow-up" : "Open"}</Pill></td><td><button className="small-action" onClick={() => openDialog("payment", undefined, patient.id)}>Record payment</button></td></tr>)}</tbody></table></section>
          <section className="panel"><div className="panel-heading"><div><h2>Transaction history</h2><p>Reversing a posted payment restores the patient balance</p></div></div><table className="wide-table"><thead><tr><th>Patient</th><th>Type</th><th>Amount</th><th>Reference</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td>{item.patient}</td><td>{item.kind}</td><td>{"$" + item.amount.toFixed(2)}</td><td>{item.reference}</td><td>{dateLabel(item.createdAt)}</td><td><Pill tone={item.status === "Posted" ? "green" : "neutral"}>{item.status}</Pill></td><td>{item.status === "Posted" && <button className="small-action" onClick={() => updateTransaction(item, "Reversed")}>Reverse</button>} <button className="small-action danger-action" onClick={() => deleteRecord("payment", item.id, "payment transaction")}>Delete</button></td></tr>)}</tbody></table></section>
        </>}

        {!loading && !loadError && active === "Analytics" && <>
          <PageTitle eyebrow="Practice intelligence" title="Analytics" description="Metrics are calculated from the current synthetic database records." />
          <div className="analytics-grid"><div className="analytics-card"><span>Patients</span><strong>{patients.length}</strong><small>Active registry</small></div><div className="analytics-card"><span>Task completion</span><strong>{tasks.length ? Math.round(tasks.filter((item) => item.status === "Completed").length / tasks.length * 100) : 0}%</strong><small>Completed tasks</small></div><div className="analytics-card"><span>Referral closure</span><strong>{referrals.length ? Math.round(referrals.filter((item) => ["Closed", "Feedback Received"].includes(item.status)).length / referrals.length * 100) : 0}%</strong><small>Closed-loop outcomes</small></div><div className="analytics-card"><span>Active care plans</span><strong>{carePlans.filter((item) => item.status === "Active").length}</strong><small>Chronic care</small></div></div>
          <div className="insight-row"><div className="insight"><span className="insight-icon purple">✦</span><div><strong>{highRisk} high-risk patients</strong><p>Review risk and open tasks in the patient registry.</p></div></div><div className="insight"><span className="insight-icon yellow">!</span><div><strong>{tasks.filter((item) => item.status !== "Completed").length} open tasks</strong><p>Uncompleted coordination work across the team.</p></div></div><div className="insight"><span className="insight-icon blue">↗</span><div><strong>{openRefs} open referrals</strong><p>Referrals still moving through the specialist workflow.</p></div></div></div>
        </>}

        {!loading && !loadError && active === "Administration" && <>
          <PageTitle eyebrow="System configuration" title="Administration" description="Demo personas and synthetic environment controls." action={<button className="primary-button" onClick={resetDemo}>↻ Reset demo data</button>} />
          <div className="admin-grid"><section className="panel"><div className="panel-heading"><div><h2>Demo users</h2><p>Role selector at the top changes the walkthrough persona</p></div></div>{users.map((user) => <div className="admin-row" key={user.id}><div className="avatar soft">{user.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div><div><strong>{user.name}</strong><small>{user.role}</small></div><Pill tone="green">Active</Pill></div>)}</section><section className="panel"><div className="panel-heading"><div><h2>Integration simulators</h2><p>No external systems are contacted</p></div></div>{["EHR / FHIR adapter", "Referral document exchange", "SMS / voice provider", "Claims status adapter"].map((label) => <div className="integration-row" key={label}><span className="integration-icon">↗</span><div><strong>{label}</strong><small>Simulated workflow · Synthetic identifiers</small></div><Pill tone="green">Demo mode</Pill></div>)}</section></div>
        </>}

        {!loading && !loadError && active === "Audit History" && <>
          <PageTitle eyebrow="Traceability" title="Audit history" description="Database-backed events for create, update, delete and workflow actions." />
          <section className="panel"><div className="audit-list">{activity.map((item) => <div className="audit-row" key={item.id}><div className={"activity-icon " + item.tone}>✦</div><div><strong>{item.action}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>)}{activity.length === 0 && <p>No audit events recorded.</p>}</div></section>
        </>}
      </div>
    </section>

    {selectedPatient && <div className="drawer-backdrop" onClick={() => setSelectedPatient(null)}><aside className="drawer" onClick={(event) => event.stopPropagation()}>
      <div className="drawer-head"><span>Patient 360</span><button onClick={() => setSelectedPatient(null)}>×</button></div>
      <div className="drawer-profile"><div className="avatar large">{selectedPatient.initials}</div><div><h2>{selectedPatient.name}</h2><p>{selectedPatient.externalId} · Age {selectedPatient.age} · ZIP {selectedPatient.zip}</p></div><Pill tone={selectedPatient.risk.toLowerCase()}>{selectedPatient.risk} risk</Pill></div>
      <div className="drawer-actions"><button className="primary-button" onClick={() => openDialog("task", undefined, selectedPatient.id)}>＋ Create task</button><button className="secondary-button" onClick={() => openDialog("communication", undefined, selectedPatient.id)}>Send outreach</button></div>
      <div className="drawer-section"><h3>Clinical summary</h3><div className="detail-grid"><span>Conditions<strong>{selectedPatient.conditions.join(", ")}</strong></span><span>Last encounter<strong>{selectedPatient.last}</strong></span><span>Next appointment<strong>{selectedPatient.next}</strong></span><span>Outstanding balance<strong>{"$" + selectedPatient.balance.toFixed(2)}</strong></span><span>Phone<strong>{selectedPatient.phone}</strong></span><span>Email<strong>{selectedPatient.email || "Not recorded"}</strong></span></div></div>
      <div className="drawer-section"><h3>Patient management</h3><div className="drawer-actions"><button className="secondary-button" onClick={() => openDialog("patient", selectedPatient)}>Edit patient</button><button className="secondary-button danger-action" onClick={() => deleteRecord("patient", selectedPatient.id, "patient")}>Delete patient</button></div></div>
      <div className="drawer-section"><h3>Related workflows</h3>{carePlans.filter((plan) => plan.patientId === selectedPatient.id).map((plan) => <div className="gap-item" key={plan.id}><span className="gap-icon blue">♡</span><div><strong>{plan.condition} care plan</strong><small>{plan.status}</small></div><button className="small-action" onClick={() => openDialog("carePlan", plan)}>Edit</button></div>)}{referrals.filter((item) => item.patientId === selectedPatient.id).map((item) => <div className="gap-item" key={item.id}><span className="gap-icon blue">↗</span><div><strong>{item.specialty} referral</strong><small>{item.status}</small></div></div>)}
      </div>
    </aside></div>}

    {dialog && <div className="dialog-backdrop" onClick={() => !saving && setDialog(null)}><section className="dialog" onClick={(event) => event.stopPropagation()}>
      <div className="dialog-heading"><div><div className="eyebrow">{dialog.record ? "Update saved record" : "New synthetic record"}</div><h2>{dialog.kind === "patient" ? (dialog.record ? "Edit patient" : "Add patient") : dialog.kind === "task" ? (dialog.record ? "Edit task" : "Create task") : dialog.kind === "referral" ? (dialog.record ? "Edit referral" : "New referral") : dialog.kind === "carePlan" ? (dialog.record ? "Edit care plan" : "Create care plan") : dialog.kind === "communication" ? (dialog.record ? "Edit communication" : "Compose message") : "Record simulated payment"}</h2></div><button className="dialog-close" onClick={() => setDialog(null)}>×</button></div>
      <form onSubmit={saveDialog}>
        {dialog.kind === "patient" && <>
          <div className="form-grid"><label className="form-field">Full name<input name="name" required minLength={2} defaultValue={dialog.record?.name || ""} /></label><label className="form-field">Age<input name="age" type="number" min="0" max="125" required defaultValue={dialog.record?.age ?? 45} /></label><label className="form-field">ZIP / postal code<input name="zip" required defaultValue={dialog.record?.zip || ""} /></label><label className="form-field">Phone<input name="phone" required defaultValue={dialog.record?.phone || ""} /></label><label className="form-field">Email<input name="email" type="email" defaultValue={dialog.record?.email || ""} /></label><label className="form-field">Risk level<select name="risk" defaultValue={dialog.record?.risk || "Low"}><option>Low</option><option>Moderate</option><option>High</option></select></label><label className="form-field">Conditions (comma-separated)<input name="conditions" defaultValue={dialog.record?.conditions?.join(", ") || ""} /></label><label className="form-field">Preferred channel<select name="preferredChannel" defaultValue={dialog.record?.preferredChannel || "SMS"}><option>SMS</option><option>Voice</option></select></label><label className="form-field">Outstanding balance ($)<input name="balance" type="number" min="0" step="0.01" defaultValue={dialog.record?.balance ?? 0} /></label><label className="form-field">Last encounter<input name="lastEncounter" defaultValue={dialog.record?.last || ""} /></label><label className="form-field">Next appointment<input name="nextAppointment" defaultValue={dialog.record?.next || ""} /></label></div><label className="form-check"><input type="checkbox" name="consent" defaultChecked={dialog.record?.consent !== false} /> Patient has consented to demo outreach</label>
        </>}
        {dialog.kind === "task" && <div className="form-grid"><label className="form-field wide-field">Task title<input name="title" required minLength={3} defaultValue={dialog.record?.title || ""} /></label><label className="form-field">Patient<select name="patientId" required defaultValue={dialog.record?.patientId || dialog.patientId || ""}><option value="">Select patient…</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} ({patient.externalId})</option>)}</select></label><label className="form-field">Category<input name="category" required defaultValue={dialog.record?.category || "Patient follow-up"} /></label><label className="form-field">Priority<select name="priority" defaultValue={dialog.record?.priority || "Medium"}><option>Low</option><option>Medium</option><option>High</option></select></label><label className="form-field">Assignee<select name="assigneeId" defaultValue={dialog.record?.assigneeId || ""}><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</select></label><label className="form-field">Due date<input name="dueDate" type="date" defaultValue={dateInput(dialog.record?.dueDate)} /></label>{dialog.record && <label className="form-field">Status<select name="status" defaultValue={dialog.record.status}><option>New</option><option>Assigned</option><option>In Progress</option><option>Waiting for Specialist</option><option>Completed</option><option>Cancelled</option></select></label>}<label className="form-field wide-field">Description<textarea name="description" rows={3} defaultValue={dialog.record?.description || ""} /></label></div>}
        {dialog.kind === "referral" && <div className="form-grid"><label className="form-field">Patient<select name="patientId" required defaultValue={dialog.record?.patientId || dialog.patientId || ""}><option value="">Select patient…</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label><label className="form-field">Specialty<input name="specialty" required defaultValue={dialog.record?.specialty || ""} /></label><label className="form-field">Priority<select name="priority" defaultValue={dialog.record?.priority || "Routine"}><option>Routine</option><option>Urgent</option><option>High</option></select></label><label className="form-field">Owner<input name="owner" required defaultValue={dialog.record?.owner || "Care Coordination"} /></label><label className="form-field wide-field">Reason<input name="reason" required minLength={3} defaultValue={dialog.record?.reason || ""} /></label><label className="form-field wide-field">Notes<textarea name="notes" rows={3} defaultValue={dialog.record?.notes || ""} /></label>{dialog.record && <label className="form-field">Status<select name="status" defaultValue={dialog.record.status}><option>Draft</option><option>Sent</option><option>Received</option><option>Appointment Scheduled</option><option>Appointment Completed</option><option>Feedback Received</option><option>Patient Unreachable</option><option>Closed</option></select></label>}</div>}
        {dialog.kind === "carePlan" && <div className="form-grid"><label className="form-field">Patient<select name="patientId" required defaultValue={dialog.record?.patientId || dialog.patientId || ""}><option value="">Select patient…</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label><label className="form-field">Condition<input name="condition" required defaultValue={dialog.record?.condition || ""} /></label><label className="form-field wide-field">Goals (separate with commas or new lines)<textarea name="goals" rows={3} defaultValue={dialog.record?.goals?.join(", ") || ""} /></label><label className="form-field wide-field">Activities (separate with commas or new lines)<textarea name="activities" rows={3} defaultValue={dialog.record?.activities?.join(", ") || ""} /></label><label className="form-field">Review date<input name="reviewDate" type="date" defaultValue={dateInput(dialog.record?.reviewDate)} /></label>{dialog.record && <label className="form-field">Status<select name="status" defaultValue={dialog.record.status}><option>Active</option><option>On Hold</option><option>Completed</option><option>Discontinued</option></select></label>}</div>}
        {dialog.kind === "communication" && <div className="form-grid"><label className="form-field">Patient<select name="patientId" required defaultValue={dialog.record?.patientId || dialog.patientId || ""}><option value="">Select patient…</option>{patients.filter((patient) => patient.consent || dialog.record?.patientId === patient.id).map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label><label className="form-field">Channel<select name="channel" defaultValue={dialog.record?.channel || "SMS"}><option>SMS</option><option>Voice</option></select></label><label className="form-field wide-field">Template<input name="template" required defaultValue={dialog.record?.template || "Care follow-up reminder"} /></label><label className="form-field wide-field">Message<textarea name="content" required rows={4} defaultValue={dialog.record?.content || ""} /></label>{dialog.record && <label className="form-field">Status<select name="status" defaultValue={dialog.record.status}><option>Draft</option><option>Queued</option><option>Sent</option><option>Delivered</option><option>Failed</option></select></label>}</div>}
        {dialog.kind === "payment" && <div className="form-grid"><label className="form-field wide-field">Patient<select name="patientId" required defaultValue={dialog.patientId || ""}><option value="">Select patient…</option>{patients.filter((patient) => patient.balance > 0).map((patient) => <option key={patient.id} value={patient.id}>{patient.name + " · Balance $" + patient.balance.toFixed(2)}</option>)}</select></label><label className="form-field">Payment amount ($)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label className="form-field">Reference<input name="reference" defaultValue={"DEMO-" + new Date().toISOString().slice(0, 10).replace(/-/g, "")} /></label><p className="form-hint wide-field">This creates a simulated payment only. The amount cannot exceed the selected patient’s current outstanding balance.</p></div>}
        <div className="dialog-actions"><button type="button" className="secondary-button" disabled={saving} onClick={() => setDialog(null)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : (dialog.record ? "Save changes" : dialog.kind === "payment" ? "Post payment" : "Save record")}</button></div>
      </form>
    </section></div>}

    {toast && <div className="toast"><span>✓</span>{toast}</div>}
    <div className="prototype-notice">RuralCare Connect is an independent demonstration prototype using synthetic data. Not a production EHR, medical device, or clinical decision-support system. Not affiliated with or endorsed by athenahealth.</div>
  </main>;
}
