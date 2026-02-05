import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, ListTodo, Clock, Users } from "lucide-react";

const stats = [
  {
    title: "Projects",
    value: "12",
    description: "Active projects",
    icon: FolderKanban,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Issues",
    value: "47",
    description: "Open issues",
    icon: ListTodo,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "Time Logged",
    value: "156h",
    description: "This month",
    icon: Clock,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Team Members",
    value: "8",
    description: "Active users",
    icon: Users,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const recentIssues = [
  { id: 1, subject: "Fix login page validation", project: "Web App", status: "In Progress", priority: "High" },
  { id: 2, subject: "Add export to PDF feature", project: "Reports", status: "New", priority: "Normal" },
  { id: 3, subject: "Update user documentation", project: "Docs", status: "Resolved", priority: "Low" },
  { id: 4, subject: "Performance optimization", project: "Backend", status: "In Progress", priority: "High" },
  { id: 5, subject: "Mobile responsive design", project: "Web App", status: "New", priority: "Normal" },
];

const statusColors: Record<string, string> = {
  "New": "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  "Resolved": "bg-green-100 text-green-800",
  "Closed": "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  "High": "text-red-600",
  "Normal": "text-gray-600",
  "Low": "text-blue-600",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your projects.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Issues</CardTitle>
          <CardDescription>Latest issues across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    <span className="text-muted-foreground">#{issue.id}</span>{" "}
                    {issue.subject}
                  </p>
                  <p className="text-sm text-muted-foreground">{issue.project}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${priorityColors[issue.priority]}`}>
                    {issue.priority}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[issue.status]}`}
                  >
                    {issue.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
