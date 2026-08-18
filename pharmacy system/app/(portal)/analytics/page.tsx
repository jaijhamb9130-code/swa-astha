"use client"

import {
  IndianRupee,
  TrendingUp,
  Users,
  RotateCcw,
  Package,
  AlertTriangle,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

import {
  revenueExpenseData,
  topSellingMedicines,
  medicines,
  formatCurrency,
} from "@/lib/mock-data"

// Compute chart colors in JS
const TEAL = "#0d9488"
const TEAL_LIGHT = "#5eead4"
const EMERALD = "#059669"
const AMBER = "#d97706"
const SKY = "#0284c7"
const SLATE = "#64748b"
const ROSE = "#e11d48"

// Revenue trend data (extended)
const revenueTrend = [
  { month: "Jul", revenue: 245000 },
  { month: "Aug", revenue: 268000 },
  { month: "Sep", revenue: 285000 },
  { month: "Oct", revenue: 310000 },
  { month: "Nov", revenue: 295000 },
  { month: "Dec", revenue: 340000 },
  { month: "Jan", revenue: 320000 },
  { month: "Feb", revenue: 365000 },
]

// Category sales data
const categorySales = [
  { name: "Antibiotic", value: 34, fill: TEAL },
  { name: "Analgesic", value: 22, fill: EMERALD },
  { name: "Antacid", value: 15, fill: AMBER },
  { name: "Supplement", value: 12, fill: SKY },
  { name: "Antihypertensive", value: 10, fill: SLATE },
  { name: "Other", value: 7, fill: ROSE },
]

// Forecast data
const forecastMedicines = [
  { name: "Paracetamol 500mg", currentStock: 450, predictedDemand: 380, daysUntilRestock: 8 },
  { name: "Amoxicillin 250mg", currentStock: 120, predictedDemand: 200, daysUntilRestock: 3 },
  { name: "Cetirizine 10mg", currentStock: 300, predictedDemand: 250, daysUntilRestock: 9 },
  { name: "Metformin 500mg", currentStock: 200, predictedDemand: 180, daysUntilRestock: 8 },
  { name: "Omeprazole 20mg", currentStock: 15, predictedDemand: 100, daysUntilRestock: 1 },
]

const revenueConfig = { revenue: { label: "Revenue", color: TEAL } }
const categoryConfig = categorySales.reduce(
  (acc, item) => ({
    ...acc,
    [item.name]: { label: item.name, color: item.fill },
  }),
  {} as Record<string, { label: string; color: string }>
)

// This month vs last month
const thisMonth = revenueExpenseData[revenueExpenseData.length - 1]
const lastMonth = revenueExpenseData[revenueExpenseData.length - 2]
const revenueGrowth = ((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue * 100).toFixed(1)
const profitThis = thisMonth.revenue - thisMonth.expense
const profitLast = lastMonth.revenue - lastMonth.expense

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-balance">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground">
          Revenue trends, category performance, and demand forecasting.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(1432)}
          change="+8.3%"
          trend="up"
          icon={<IndianRupee className="size-4" />}
        />
        <MetricCard
          title="Daily Customers"
          value="34"
          change="+12%"
          trend="up"
          icon={<Users className="size-4" />}
        />
        <MetricCard
          title="Return Rate"
          value="2.1%"
          change="-0.5%"
          trend="down"
          icon={<RotateCcw className="size-4" />}
        />
        <MetricCard
          title="Revenue Growth"
          value={`${revenueGrowth}%`}
          change="vs last month"
          trend="up"
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      {/* Revenue Chart + Category Pie */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 8 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="h-[280px] w-full">
              <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                <Area type="monotone" dataKey="revenue" stroke={TEAL} strokeWidth={2} fill="url(#revGradient)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Sales by Category</CardTitle>
            <CardDescription>Percentage distribution this month</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ChartContainer config={categoryConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie
                  data={categorySales}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  strokeWidth={2}
                >
                  {categorySales.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {categorySales.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Comparison + Demand Forecast */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Month Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Month-over-Month Comparison</CardTitle>
            <CardDescription>{lastMonth.month} vs {thisMonth.month}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <ComparisonCard label="Revenue" current={thisMonth.revenue} previous={lastMonth.revenue} />
              <ComparisonCard label="Expenses" current={thisMonth.expense} previous={lastMonth.expense} />
              <ComparisonCard label="Profit" current={profitThis} previous={profitLast} />
              <ComparisonCard label="Margin" current={Math.round(profitThis / thisMonth.revenue * 100)} previous={Math.round(profitLast / lastMonth.revenue * 100)} isPercent />
            </div>
          </CardContent>
        </Card>

        {/* Demand Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demand Forecast</CardTitle>
            <CardDescription>Predicted restock needs for top medicines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {forecastMedicines.map((med) => {
                const urgency =
                  med.daysUntilRestock <= 2 ? "critical" :
                  med.daysUntilRestock <= 5 ? "warning" : "normal"
                return (
                  <div key={med.name} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      urgency === "critical" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                      urgency === "warning" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-primary/10 text-primary"
                    }`}>
                      {urgency === "critical" ? <AlertTriangle className="size-3.5" /> : <Package className="size-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{med.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {med.currentStock} | Demand: {med.predictedDemand}/mo
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] font-medium shrink-0 ${
                      urgency === "critical" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                      urgency === "warning" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}>
                      {med.daysUntilRestock}d to restock
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// --- Sub-components ---

function MetricCard({
  title,
  value,
  change,
  trend,
  icon,
}: {
  title: string
  value: string
  change: string
  trend: "up" | "down"
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold tracking-tight mt-0.5">{value}</p>
          <p className={`text-xs font-medium mt-1 ${
            trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}>
            {change}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ComparisonCard({
  label,
  current,
  previous,
  isPercent = false,
}: {
  label: string
  current: number
  previous: number
  isPercent?: boolean
}) {
  const change = previous !== 0 ? ((current - previous) / previous * 100).toFixed(1) : "0"
  const isPositive = current >= previous

  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5 tabular-nums">
        {isPercent ? `${current}%` : formatCurrency(current)}
      </p>
      <p className={`text-xs font-medium ${
        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}>
        {isPositive ? "+" : ""}{change}% vs last month
      </p>
    </div>
  )
}
