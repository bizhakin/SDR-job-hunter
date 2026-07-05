import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceSupabase } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'

const SAMPLE_JOBS = [
  {
    source: 'manual',
    company: 'CloseFast Inc.',
    title: 'Senior Closer — High-Ticket Coaching',
    role_type: 'closer',
    comp_structure: '$80k base + uncapped commission ($150k+ OTE)',
    remote: true,
    raw_text:
      'We need a high-ticket closer for our $5k-$10k coaching programs. You will handle inbound leads from warm webinars. Must have 3+ years experience closing $2k+ products. CRM experience required. Weekly roleplay and coaching included. Start immediately.',
    tags: ['high-ticket', 'coaching', 'inbound', 'warm-transfers'],
  },
  {
    source: 'manual',
    company: 'ScaleSetters',
    title: 'Appointment Setter — B2B SaaS',
    role_type: 'setter',
    comp_structure: '$4k base + $500 per qualified meeting',
    remote: true,
    raw_text:
      'Looking for an experienced B2B setter to book demos for our sales team. Target accounts are SMBs in the US. You will be given 50+ leads per day. Must hit 8+ qualified meetings per week. Cold calling and email outreach. Uncapped commission structure.',
    tags: ['b2b', 'saas', 'cold-calling', 'high-volume'],
  },
  {
    source: 'manual',
    company: 'GrowthWave',
    title: 'SDR — FinTech Startup',
    role_type: 'sdr',
    comp_structure: '$55k base + $30k variable',
    remote: true,
    raw_text:
      'Early-stage fintech looking for a hungry SDR to build pipeline. You will prospect into mid-market CFOs and finance leaders. Multi-channel outreach (email, LinkedIn, cold call). Strong track record of quota attainment preferred. Path to AE within 12 months.',
    tags: ['fintech', 'mid-market', 'multi-channel', 'career-growth'],
  },
  {
    source: 'manual',
    company: 'Premier Closers',
    title: 'Commission-Only Closer — Home Services',
    role_type: 'closer',
    comp_structure: '10% commission on closed deals ($2k-$10k per deal)',
    remote: true,
    raw_text:
      'Experienced closer needed for a high-volume home services company. You will close $3k-$15k jobs over the phone. Leads are pre-qualified and sent directly to you. Must be comfortable with objection handling around pricing and scope. Top performers clear $20k/month.',
    tags: ['commission-only', 'home-services', 'high-volume', 'pre-qualified'],
  },
  {
    source: 'manual',
    company: 'Outbound Pros',
    title: 'BDR — Enterprise SaaS',
    role_type: 'bdr',
    comp_structure: '$65k base + $35k variable',
    remote: true,
    raw_text:
      'Hiring a BDR to target enterprise accounts ($500M+ revenue). You will work closely with AEs to build territory strategy. Must have 2+ years of BDR experience. Experience with Salesforce, Outreach.io, and ZoomInfo strongly preferred. Competitive benefits package.',
    tags: ['enterprise', 'saas', 'territory-strategy', 'salesforce'],
  },
  {
    source: 'manual',
    company: 'Income Ignition',
    title: 'High-Ticket Closer — Info Products',
    role_type: 'closer',
    comp_structure: '$3k base + 15% commission ($12k-$18k/month average)',
    remote: true,
    raw_text:
      'We are a fast-growing education company selling $3k-$7k courses and high-touch coaching. You will close warm inbound calls from Facebook ads and webinars. Script provided but must be able to adapt naturally. Training provided. Must have a quiet home office.',
    tags: ['high-ticket', 'education', 'inbound', 'warm-leads'],
  },
  {
    source: 'manual',
    company: 'DealMakers',
    title: 'Setter — Real Estate Investment',
    role_type: 'setter',
    comp_structure: '$500 per qualified appointment + bonuses',
    remote: true,
    raw_text:
      'Looking for a real estate setter to book calls between investors and our acquisition team. You will call from a list of motivated sellers. Must be comfortable with high volume (100+ calls/day). Script provided. No license needed. Full training provided.',
    tags: ['real-estate', 'high-volume', 'cold-calling', 'script-based'],
  },
  {
    source: 'manual',
    company: 'SaaSForce',
    title: 'SDR Team Lead',
    role_type: 'sdr',
    comp_structure: '$70k base + $20k variable + equity',
    remote: true,
    raw_text:
      'Lead a team of 5 SDRs at a Series B SaaS company. You will carry a small personal quota while coaching your team. Must have 3+ years SDR experience with at least 1 year in a leadership role. Experience building playbooks and running training sessions.',
    tags: ['team-lead', 'saas', 'coaching', 'series-b'],
  },
  {
    source: 'manual',
    company: 'CloseMore Media',
    title: 'Media Buyer + Closer Hybrid',
    role_type: 'closer',
    comp_structure: '$5k base + 5% rev share',
    remote: true,
    raw_text:
      'Unique hybrid role: you will run Facebook ad campaigns AND close the leads they generate. Must understand both direct response marketing and phone sales. Best for someone who wants full ownership of the sales cycle. Proven track record in either discipline required.',
    tags: ['hybrid', 'media-buying', 'full-cycle', 'high-autonomy'],
  },
  {
    source: 'manual',
    company: 'Accelerate Outbound',
    title: 'BDR Manager — SaaS',
    role_type: 'bdr',
    comp_structure: '$85k base + $40k variable + equity',
    remote: true,
    raw_text:
      'Build and lead our BDR team from the ground up. You will hire, train, and manage 6-8 BDRs targeting mid-market accounts. Must have experience building outbound processes from scratch. Familiarity with modern sales tech stack required. Series A funded.',
    tags: ['management', 'saas', 'build-from-scratch', 'series-a'],
  },
  {
    source: 'manual',
    company: 'Virtual Sales Solutions',
    title: 'D2D Appointment Setter',
    role_type: 'setter',
    comp_structure: '$25/hr + $100 per booked appointment',
    remote: false,
    raw_text:
      'Setting appointments for a home improvement company. Must be local to Phoenix, AZ for door-to-door canvassing. You will knock 80+ doors per day to book free estimates. High energy and thick skin required. Top setters make $8k+/month.',
    tags: ['d2d', 'home-improvement', 'high-energy', 'in-person'],
  },
  {
    source: 'manual',
    company: 'Elite Closing Group',
    title: 'Senior Setter — High Net Worth',
    role_type: 'setter',
    comp_structure: '$6k base + $750 per qualified intro',
    remote: true,
    raw_text:
      'Setting high-ticket appointments for a luxury wealth management firm. You will connect with HNW individuals via warm referrals and LinkedIn outreach. Must be polished, professional, and comfortable talking about investments. Series 65 a plus but not required.',
    tags: ['hnw', 'wealth-management', 'linkedIn', 'warm-outreach'],
  },
  {
    source: 'manual',
    company: 'StartupSales.io',
    title: 'Founder Associate — Sales',
    role_type: 'sdr',
    comp_structure: '$60k + equity (0.5-1%)',
    remote: true,
    raw_text:
      'Early employee at a fast-growing sales tech startup. You will be the first sales hire and build the playbook from scratch. Must be comfortable with full-cycle sales (prospecting to close). Ideal for someone who wants to learn startup sales and grow into a leadership role.',
    tags: ['startup', 'first-hire', 'full-cycle', 'equity'],
  },
  {
    source: 'manual',
    company: 'Capital Closers',
    title: 'Closer — Business Financing',
    role_type: 'closer',
    comp_structure: '100% commission — $2k-$5k per closed deal',
    remote: true,
    raw_text:
      'Close business financing deals ($50k-$500k). Warm inbound leads from business owners who have already applied. Must be comfortable with financial concepts and objection handling around rates and terms. Top closers earn $25k+/month. Training provided.',
    tags: ['financing', '100%-commission', 'inbound', 'uncapped'],
  },
  {
    source: 'manual',
    company: 'Growth Lab Media',
    title: 'Cold Call Setter — Agency',
    role_type: 'setter',
    comp_structure: '$3k base + $300 per qualified lead',
    remote: true,
    raw_text:
      'Setting appointments for a digital marketing agency. You will cold call business owners who match our ICP. Must be comfortable with rejection and able to make 60+ calls per day. No experience necessary — we train. Fast promotion path to closer role.',
    tags: ['agency', 'cold-calling', 'entry-level', 'training'],
  },
  {
    source: 'manual',
    company: 'RevOps Recruiters',
    title: 'SDR — Staffing Industry',
    role_type: 'sdr',
    comp_structure: '$45k base + $25k commission',
    remote: true,
    raw_text:
      'Prospect into hiring managers at growing companies. You will book meetings for our senior recruiters. Must be comfortable with high volume outreach and CRM tracking. Staffing industry experience a plus. Great culture and team events quarterly.',
    tags: ['staffing', 'high-volume', 'hiring', 'crm'],
  },
]

export async function POST(_request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.' },
        { status: 500 },
      )
    }

    const supabase = serviceRoleKey
      ? createServerClient(supabaseUrl, serviceRoleKey, {
          cookies: {
            getAll: () => Promise.resolve([]),
            setAll: () => Promise.resolve(),
          },
        })
      : await getServiceSupabase()

    let inserted = 0
    let skipped = 0

    for (const job of SAMPLE_JOBS) {
      const { data: existing } = await supabase
        .from('job_posts')
        .select('id')
        .eq('company', job.company)
        .eq('title', job.title)
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      let embedding: number[] | null = null
      const textToEmbed = `${job.title} ${job.company} ${job.raw_text}`
      try {
        embedding = await generateEmbedding(textToEmbed)
      } catch {
        // embedding is optional for seed data
      }

      const { error: insertError } = await supabase.from('job_posts').insert({
        ...job,
        embedding: embedding ? JSON.parse(JSON.stringify(embedding)) : null,
      })

      if (!insertError) {
        inserted++
      }
    }

    return NextResponse.json({
      inserted,
      skipped,
      total: SAMPLE_JOBS.length,
      message: `Inserted ${inserted} jobs (${skipped} already existed)`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
