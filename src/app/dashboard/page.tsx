import * as React from "react"
import { AppLayoutCustom } from "@/components/layout/app-layout-custom"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Building2, 
  Target, 
  TrendingUp, 
  Activity,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"

export default function DashboardPage() {
  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Dashboard" />
        
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome back! Here's what's happening with your CRM today.
                </p>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Quick Add
              </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,845</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">+20.1%</span>
                    from last month
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,247</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">+12.5%</span>
                    from last month
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Open Opportunities</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">89</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                    <span className="text-red-500">-2.1%</span>
                    from last month
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$45,231</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">+15.3%</span>
                    from last month
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid gap-4 md:grid-cols-7">
              <Card className="md:col-span-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest updates from your CRM
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                      <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          New lead created: John Smith from Acme Corp
                        </p>
                        <p className="text-xs text-muted-foreground">
                          2 minutes ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="h-2 w-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Deal closed: $12,500 with TechStart Inc.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          1 hour ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="h-2 w-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Follow-up reminder: Contact Sarah Johnson
                        </p>
                        <p className="text-xs text-muted-foreground">
                          3 hours ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-4">
                      <div className="h-2 w-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Meeting scheduled with Global Solutions
                        </p>
                        <p className="text-xs text-muted-foreground">
                          5 hours ago
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks and shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Lead
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Building2 className="mr-2 h-4 w-4" />
                    Create Company
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="mr-2 h-4 w-4" />
                    New Opportunity
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="mr-2 h-4 w-4" />
                    Schedule Activity
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Pipeline Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Overview</CardTitle>
                <CardDescription>
                  Current status of your sales pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Prospecting</Badge>
                    <span className="text-sm text-muted-foreground">23 leads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Qualification</Badge>
                    <span className="text-sm text-muted-foreground">18 leads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Proposal</Badge>
                    <span className="text-sm text-muted-foreground">12 leads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Negotiation</Badge>
                    <span className="text-sm text-muted-foreground">7 leads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Closed Won</Badge>
                    <span className="text-sm text-muted-foreground">15 this month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  )
}
