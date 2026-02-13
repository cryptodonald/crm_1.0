#!/usr/bin/env python3
"""Generate Google Ads API Design Document PDF for Basic Access application."""

from fpdf import FPDF
import os

OUTPUT = os.path.join(os.path.dirname(__file__), "google-ads-api-design-doc.pdf")
SCREENSHOT = "/Users/matteolavoro/Desktop/Screenshot 2026-02-13 alle 11.42.04.png"


class DesignDoc(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 8, "DoctorBed CRM - Google Ads API Design Document", align="L")
        self.ln(10)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(2)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(30, 30, 30)
        self.ln(6)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(50, 120, 200)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 80, self.get_y())
        self.set_line_width(0.2)
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(50, 50, 50)
        self.ln(3)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.cell(0, 5.5, "  - " + text, new_x="LMARGIN", new_y="NEXT")

    def key_value(self, key, value):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(40, 40, 40)
        self.cell(50, 6, key + ":")
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, value, new_x="LMARGIN", new_y="NEXT")


def build():
    pdf = DesignDoc()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ── Title ──
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(20, 20, 20)
    pdf.cell(0, 12, "Google Ads API - Design Document", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 8, "Basic Access Application", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # ── Company Info ──
    pdf.section_title("1. Company Information")
    pdf.key_value("Company Name", "DoctorBed (brand of DONALD TRADING SRL)")
    pdf.key_value("Legal Entity", "DONALD TRADING SRL")
    pdf.key_value("Address", "Via XXV Marzo, 27/c - 47893 San Marino")
    pdf.key_value("Website", "https://www.materassidoctorbed.com")
    pdf.key_value("Contact Email", "info@materassidoctorbed.com")
    pdf.key_value("MCC Account ID", "329-974-9648")
    pdf.key_value("Developer Token Level", "Explorer (applying for Basic)")
    pdf.key_value("Application Date", "February 2026")
    pdf.ln(2)

    # ── Product Description ──
    pdf.section_title("2. Product Description")
    pdf.body_text(
        "DoctorBed CRM 2.0 is an internal Customer Relationship Management system built "
        "for the DoctorBed mattress brand. The application is used exclusively by internal "
        "employees (sales team and management) to manage leads, track orders, and monitor "
        "marketing performance."
    )
    pdf.body_text(
        'The "SEO & Ads Intelligence" module within the CRM integrates with the Google Ads '
        "API to provide read-only reporting dashboards. This module consolidates campaign "
        "performance data, keyword metrics, and competitor insights into a single internal "
        "dashboard, eliminating the need to switch between multiple Google tools."
    )

    pdf.sub_title("Key Capabilities")
    pdf.bullet("Campaign Performance: Daily sync of impressions, clicks, CTR, CPC, cost, conversions, ROAS")
    pdf.bullet("Keyword Research: Automated keyword idea generation via Keyword Planner API (requires Basic Access)")
    pdf.bullet("Competitor Analysis: Auction insights (impression share, overlap rate, position above rate)")
    pdf.bullet("Lead Attribution: Correlate Google Ads campaigns with CRM lead sources")
    pdf.bullet("Analytics Integration: Google Analytics 4 and Search Console data alongside Ads metrics")

    pdf.sub_title("Access Model")
    pdf.bullet("Internal use only - no external/third-party users")
    pdf.bullet("Authenticated via Google OAuth (NextAuth v4)")
    pdf.bullet("2-3 internal users (sales team + management)")
    pdf.bullet("No data is shared with external parties")
    pdf.bullet("No automated bidding or campaign modifications - strictly read-only")

    # ── Technical Architecture ──
    pdf.section_title("3. Technical Architecture")

    pdf.sub_title("Technology Stack")
    pdf.key_value("Framework", "Next.js 16 (App Router) + TypeScript strict")
    pdf.key_value("Database", "PostgreSQL 17.6 (Supabase)")
    pdf.key_value("Cache", "Upstash Redis")
    pdf.key_value("Auth", "NextAuth v4 (Google OAuth)")
    pdf.key_value("Hosting", "Vercel (serverless)")
    pdf.key_value("Domain", "crm.doctorbed.app")

    pdf.sub_title("Google Ads API Integration Details")
    pdf.body_text(
        "The integration uses the google-ads-api Node.js library to communicate with "
        "the Google Ads API v18. All API calls are server-side only (Next.js API routes "
        "and Vercel cron jobs). No client-side API calls are made."
    )

    pdf.sub_title("API Services Used")
    pdf.bullet("GoogleAdsService.SearchStream - Campaign/ad group performance reporting (GAQL queries)")
    pdf.bullet("KeywordPlanIdeaService.GenerateKeywordIdeas - Keyword research and suggestions (requires Basic Access)")
    pdf.bullet("GoogleAdsService.SearchStream - Auction insights for competitor analysis")

    pdf.sub_title("Authentication Flow")
    pdf.body_text(
        "1. OAuth2 refresh token stored securely in Vercel environment variables\n"
        "2. Server-side token refresh via google-ads-api client library\n"
        "3. No user-facing OAuth consent - single pre-authorized account\n"
        "4. Developer token + MCC account ID for API access"
    )

    # ── Data Flow ──
    pdf.section_title("4. Data Flow & Storage")

    pdf.sub_title("Daily Sync (Automated Cron - runs once per day)")
    pdf.body_text(
        "1. Fetch campaign performance data via GoogleAdsService.SearchStream\n"
        "2. Fetch Google Analytics 4 data via GA4 Data API\n"
        "3. Fetch Search Console organic metrics\n"
        "4. Fetch auction insights for competitor analysis\n"
        "5. Upsert all data into PostgreSQL tables\n"
        "6. Invalidate Redis cache for affected dashboard views"
    )

    pdf.sub_title("Weekly Research (Automated Cron - runs once per week)")
    pdf.body_text(
        "1. Call KeywordPlanIdeaService.GenerateKeywordIdeas for tracked keywords\n"
        "2. Store keyword suggestions with search volume, competition, CPC estimates\n"
        "3. Update keyword difficulty scores and trend data\n"
        "4. This step requires Basic Access (currently blocked with Explorer)"
    )

    pdf.sub_title("Database Tables (SEO & Ads module)")
    pdf.bullet("seo_keywords - Tracked keywords with metrics (search volume, position, difficulty)")
    pdf.bullet("seo_campaign_performance - Daily campaign metrics (impressions, clicks, cost, conversions)")
    pdf.bullet("seo_competitor_insights - Auction insights per competitor domain")
    pdf.bullet("seo_analytics - GA4 traffic data (sessions, users, bounce rate, conversions)")
    pdf.bullet("seo_backlinks - Backlink tracking (domain authority, status)")

    # ── API Usage ──
    pdf.section_title("5. API Usage & Rate Limits")
    pdf.body_text(
        "Our API usage is minimal and well within Google's rate limits:"
    )
    pdf.bullet("Daily sync: ~5-10 API calls per day (campaign report + auction insights)")
    pdf.bullet("Weekly research: ~2-5 API calls per week (keyword ideas for tracked keywords)")
    pdf.bullet("Total estimated: < 100 API calls per day (well under Basic Access limits)")
    pdf.bullet("All calls are server-side with exponential backoff retry logic")
    pdf.bullet("Upstash Redis rate limiting: max 60 reads/min, 20 writes/min per user")

    pdf.sub_title("Error Handling")
    pdf.bullet("Exponential backoff with jitter for transient errors")
    pdf.bullet("Graceful degradation: if Google Ads API is unavailable, dashboard shows cached data")
    pdf.bullet("Structured error logging with context (no PII in logs)")
    pdf.bullet("Health check endpoint monitors API connectivity")

    # ── Compliance ──
    pdf.section_title("6. Compliance & Security")
    pdf.bullet("All API credentials stored as Vercel environment variables (never in source code)")
    pdf.bullet("No end-user data is collected or shared - internal tool only")
    pdf.bullet("HTTPS enforced on all endpoints (Vercel automatic TLS)")
    pdf.bullet("Rate limiting per user per endpoint (Upstash Redis)")
    pdf.bullet("Input validation via Zod schemas on all API routes")
    pdf.bullet("Authentication required for all dashboard access (NextAuth v4)")
    pdf.bullet("No automated campaign modifications - all Ads API usage is read-only")
    pdf.bullet("Google Ads API Terms of Service: compliant (read-only, internal use)")

    # ── Screenshot ──
    pdf.section_title("7. Application Screenshot")
    pdf.body_text(
        "Below is a screenshot of the SEO & Ads Intelligence dashboard in the DoctorBed CRM, "
        "showing the Overview tab with live campaign data synced from Google Ads, Google Analytics, "
        "and Search Console."
    )
    pdf.ln(2)

    if os.path.exists(SCREENSHOT):
        # Fit the screenshot to page width (with margins)
        page_width = pdf.w - 20  # 10mm margin each side
        pdf.image(SCREENSHOT, x=10, w=page_width)
        pdf.ln(4)
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 5, "Fig. 1: SEO & Ads Intelligence Dashboard - Overview (live production data)", align="C",
                 new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.body_text("[Screenshot not found at expected path]")

    # ── Summary ──
    pdf.add_page()
    pdf.section_title("8. Summary")
    pdf.body_text(
        "DoctorBed CRM 2.0 is an internal business tool that integrates with the Google Ads API "
        "for read-only reporting purposes. We are requesting Basic Access to unlock the "
        "KeywordPlanIdeaService, which is the only service requiring access beyond Explorer level."
    )
    pdf.body_text(
        "Our usage is minimal (< 100 API calls/day), strictly read-only, internal-only, and fully "
        "compliant with Google Ads API Terms of Service. No campaign modifications, no third-party "
        "access, no end-user data collection."
    )
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 8, "Contact Information", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(40, 40, 40)
    pdf.key_value("Company", "DONALD TRADING SRL (DoctorBed)")
    pdf.key_value("Address", "Via XXV Marzo, 27/c - 47893 San Marino")
    pdf.key_value("Email", "info@materassidoctorbed.com")
    pdf.key_value("Website", "https://www.materassidoctorbed.com")
    pdf.key_value("CRM URL", "https://crm.doctorbed.app")

    pdf.output(OUTPUT)
    print(f"PDF generated: {OUTPUT}")


if __name__ == "__main__":
    build()
