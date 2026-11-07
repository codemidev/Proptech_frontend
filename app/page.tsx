"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import s from "./landing.module.css";

const SIGN_UP = "/sign-up"; // adjust to your Clerk route
const LOGIN = "/sign-in";
const NAV: [string, string][] = [["Product", "#product"], ["Solutions", "#solutions"], ["LandVault", "#landvault"], ["Features", "#features"], ["Resources", "#how"], ["Properties", "/properties"]];

const P: Record<string, string> = {
  building: "M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  map: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10M9 12l2 2 4-4",
  chart: "M3 3v18h18M7 14l4-4 3 3 5-6",
  user: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  check: "M20 6 9 17l-5-5",
  menu: "M4 8h16M4 16h16",
  home: "M3 11l9-8 9 8M5 10v10h14V10",
  tick: "M20 6 9 17l-5-5",
};
const Ic = ({ n, size = 18 }: { n: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={P[n]} /></svg>
);

const caps: [string, string][] = [["Property management", "building"], ["Tenant management", "users"], ["Agent management", "user"], ["Land registration", "map"], ["Land verification", "shield"], ["Digital records", "file"]];
const props = [["Emerald Court", "Lekki Phase 1, Lagos", "18 / 20 units"], ["Parkview Residences", "Ikoyi, Lagos", "12 / 12 units"], ["The Oak Apartments", "Victoria Island, Lagos", "8 / 10 units"]];
const side = [["Overview", "home"], ["Properties", "building"], ["Tenants", "users"], ["Activity", "chart"], ["LandVault", "map"]];
const activity = [["#FFE114", "A new chapter for Unit 3B", "Tenant application received", "12 minutes ago"], ["#8ED4B2", "One less thing to do", "Maintenance request resolved", "1 hour ago"], ["#DED5A1", "Records in order", "Property document added", "2 hours ago"]];

const roles = [
  { tone: "cream", icon: "building", t: "For landlords.", l: "Less chasing. More clarity.", b: "Stay close to every property you own.", items: ["Properties, units, and occupancy", "Tenant applications and records", "Maintenance and property activity"], cta: "Meet your workspace" },
  { tone: "green", icon: "users", t: "For tenants.", l: "Feel more at home.", b: "Keep the everyday details within reach.", items: ["Rental and lease information", "Rent payments and reminders", "Maintenance requests and updates"], cta: "Make yourself at home" },
  { tone: "blue", icon: "user", t: "For agents.", l: "More connections. Fewer loose ends.", b: "Keep every opportunity moving.", items: ["Listings and client portfolios", "Leads, viewings, and applications", "Commissions and performance"], cta: "Find your momentum" },
];

const perspective = [["Every property, in perspective.", "Keep units, occupancy, and property information together.", "building"], ["People, beyond the paperwork.", "Find tenant records and applications right where you need them.", "users"], ["Stay a step ahead.", "Follow maintenance, inspections, and recent activity.", "chart"]];
const lvSteps = ["Register land", "Submit documents", "Review & verify", "Keep your record"];
const how = [["Make yourself an account.", "Choose your role as a landlord, tenant, or agent."], ["Find your starting point.", "Add your properties, find your rental, or organize your listings."], ["Bring the everyday into one place.", "Connect people, manage records, and follow what’s happening."], ["Give your land a digital home.", "For landowners: register, submit documents, and follow review in LandVault."]];
const features: [string, string, string][] = [["Property management", "Properties, units, and occupancy in one clear view.", "building"], ["Tenant management", "Applications, tenancy details, and relationships that stay connected.", "users"], ["Agent management", "Keep clients, listings, and property opportunities moving.", "user"], ["LandVault", "A dedicated home for your land and ownership records.", "map"], ["Land registration", "Capture your land information in a digital record.", "file"], ["Land verification", "Submit documents and follow the review status.", "check"], ["Digital records", "Find important information without the paper trail.", "file"], ["Notifications", "Keep up with requests, reminders, and property updates.", "bell"], ["Property documents", "Keep leases and supporting files with their property.", "file"], ["User profiles", "Give every person a place within the platform.", "user"], ["Activity tracking", "Follow applications, inspections, and maintenance.", "chart"], ["Dashboards & reports", "Make sense of occupancy, revenue, and performance.", "chart"]];
const people = [["CO", "Chinedu Obi", "Emerald Court · Unit 3B", "Active lease", 0], ["AN", "Amara Nwosu", "Parkview · Unit 6A", "Active lease", 0], ["TB", "Tunde Bakare", "The Oak · Unit 2C", "Under review", 1]] as const;
const trust = [["The right access.", "Role-based workspaces help keep information relevant to the people managing it.", "user"], ["A clearer paper trail.", "Keep supporting documents and property records organized and easy to find.", "file"], ["Know where things stand.", "Clear review and verification statuses help you follow every submitted record.", "shield"]];

const Logo = () => (
  <span className={s.logo}>
    <Image
      src="/brand/aviritech-logo.svg"
      alt="Aviritech Proptech"
      width={180}
      height={48}
      priority
      className={s.logoImg}
    />
  </span>
);
const Eyebrow = ({ c, center, icon }: { c: string; center?: boolean; icon?: string }) => (
  <p className={`${s.eyebrow} ${center ? s.ctr : ""}`}>{icon && <Ic n={icon} size={16} />}{c}</p>
);

function RoleVisual({ i }: { i: number }) {
  if (i === 0) {
    const bars = [12, 19, 24, 19, 12, 24, 12, 28, 28, 31];
    return (
      <div className={`${s.mini} ${s.tiltL}`}>
        <small className={s.cap}>PORTFOLIO OVERVIEW</small>
        <div className={s.big2}><div><strong>12</strong><small>properties</small></div><div><strong>90%</strong><small>occupied</small></div></div>
        <div className={s.bars}>{bars.map((h, k) => <i key={k} style={{ height: h, background: k > 6 ? "#FFE114" : h > 20 ? "#FFE96B" : "#FFF2A6" }} />)}</div>
        <small className={s.muted}>A clearer picture, every day.</small>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className={s.tenantWrap}>
        <div className={`${s.mini} ${s.tiltR} ${s.cen}`}>
          <span className={s.sq}><Ic n="home" size={20} /></span>
          <small className={s.cap}>YOUR PLACE</small>
          <b>Emerald Court, 3B</b>
          <small className={s.muted}>Lekki Phase 1, Lagos</small>
          <div className={s.rowHead}><small>Your tenancy</small><span className={s.pillOk}>Active</span></div>
        </div>
        <span className={s.float}><Ic n="check" size={13} /> All settled in.</span>
      </div>
    );
  }
  return (
    <div className={`${s.mini} ${s.tiltL}`}>
      <small className={s.cap}>YOUR NEXT CONNECTION</small>
      <div className={s.rowStart}><span className={s.avatar}>CO</span><div><b>Chinedu Obi</b><small className={s.muted}>Looking for a 3-bedroom home</small></div></div>
      <div className={s.pills}><span>New</span><span>Contacted</span><span className={s.pillQ}>Qualified</span></div>
      <small className={s.muted}><Ic n="map" size={10} /> Lekki Phase 1, Lagos</small>
    </div>
  );
}

export default function LandingPage() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();
  return (
    <div id="top" className={s.page}>
      <header className={s.header}>
        <div className={s.hin}>
          <Link href="#top" aria-label="Aviritech Proptech home"><Logo /></Link>
          <nav className={s.pillNav} aria-label="Main">{NAV.map(([n, h]) => <a key={n} href={h}>{n}</a>)}</nav>
          <div className={s.hact}>
            {isSignedIn ? (
              <Link href="/dashboard" className={s.btnY}>Dashboard <span>↗</span></Link>
            ) : (
              <>
                <Link href={LOGIN} className={s.login}>Log in</Link>
                <Link href={SIGN_UP} className={s.btnY}>Get started <span>↗</span></Link>
              </>
            )}
            <button className={s.menuBtn} aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(!open)}><Ic n="menu" size={20} /></button>
          </div>
        </div>
        {open && <nav className={s.drawer}>{NAV.map(([n, h]) => <a key={n} href={h} onClick={() => setOpen(false)}>{n}</a>)}{!isSignedIn && <Link href={LOGIN}>Log in</Link>}</nav>}
      </header>

      <main>
        {/* HERO */}
        <section id="product" className={`${s.wrap} ${s.hero} ${s.ctr}`}>
          <Eyebrow c="A clearer way to property" center icon="tick" />
          <h1 className={s.h1}>Your properties. Perfectly <u>connected.</u></h1>
          <p className={s.lede}>Bring your properties, people, and land records together. One thoughtful platform for landlords, tenants, agents, and landowners.</p>
          <div className={s.ctas}>
            <Link href={SIGN_UP} className={`${s.btnY} ${s.lg}`}>Get started <span>↗</span></Link>
            <a href="#features" className={`${s.btnO} ${s.lg}`}>Explore features <Ic n="chart" size={18} /></a>
          </div>
          <div className={s.stage}>
            <div className={s.frame}>
              <div className={s.dash}>
                <aside className={s.sidebar}>
                  <div className={s.brandS}><b>a↗</b> aviritech</div>
                  <small className={s.muted}>YOUR WORKSPACE</small>
                  {side.map(([n, ic], k) => (
                    <span key={n} className={`${s.sideItem} ${k === 0 ? s.sideOn : ""}`}><Ic n={ic} size={16} />{n}{n === "LandVault" && <em>NEW</em>}</span>
                  ))}
                  <div className={s.me}><span className={s.avatar}>AO</span><div><b>Adebayo Okonkwo</b><small className={s.muted}>Landlord workspace</small></div></div>
                </aside>
                <div className={s.dmain}>
                  <div className={s.crumb}><span>Workspace <i>/</i> Overview</span><small className={s.muted}>Product preview <Ic n="bell" size={16} /></small></div>
                  <div className={s.dhead}>
                    <div><h2 className={s.h2s}>A good day for your properties.</h2><p className={s.muted}>Here’s what’s happening across your portfolio.</p></div>
                    <span className={s.sel}>This month ▾</span>
                  </div>
                  <div className={s.stats}>
                    <div><small>Total properties</small><strong>12</strong><em>Across your portfolio</em></div>
                    <div><small>Occupied units</small><strong>38<span> / 42</span></strong><em className={s.ok}>90% occupancy</em></div>
                    <div><small>Active tenants</small><strong>38</strong><em>Everything in one place</em></div>
                  </div>
                  <div className={s.two}>
                    <div>
                      <div className={s.rowHead}><b>Your properties</b><a href="#features">View all ↗</a></div>
                      {props.map(([n, l, u], k) => (
                        <div className={s.row} key={n}>
                          <span className={`${s.ico} ${k === 0 ? s.icoY : ""}`}><Ic n="building" /></span>
                          <div><b>{n}</b><small className={s.muted}>{l}</small></div>
                          <span className={s.pillOk}>Active</span><small className={`${s.muted} ${s.units}`}>{u}</small>
                        </div>
                      ))}
                    </div>
                    <div className={s.actCol}>
                      <div className={s.rowHead}><b>Recent activity</b><Ic n="chart" size={16} /></div>
                      {activity.map(([c, t, d, w]) => (
                        <div className={s.act} key={t}><i style={{ background: c }} /><div><b>{t}</b><small className={s.muted}>{d}</small><small className={s.muted}>{w}</small></div></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p className={s.fineC}>A connected view of your world. <span>Illustrative product data.</span></p>
              <span className={`${s.float} ${s.fl1}`}><i className={s.dotY}><Ic n="users" size={14} /></i> Everyone. On the same page.</span>
              <span className={`${s.float} ${s.fl2}`}><i className={s.dotG} /> A little more organized.</span>
            </div>
          </div>
        </section>

        <ul className={s.caps}>{caps.map(([c, ic]) => <li key={c}><Ic n={ic} size={17} />{c}</li>)}</ul>

        {/* ROLES */}
        <section id="solutions" className={`${s.wrap} ${s.sec} ${s.ctr}`}>
          <Eyebrow c="BUILT AROUND YOU" center />
          <h2 className={s.h2}>Different roles. One shared world.</h2>
          <p className={s.lede}>Wherever you stand in property, find your place.</p>
          <div className={s.roles}>
            {roles.map((r, i) => (
              <article key={r.t} className={`${s.role} ${s[r.tone]}`}>
                <div className={s.visual}><RoleVisual i={i} /></div>
                <div className={s.rbody}>
                  <span className={s.circ}><Ic n={r.icon} size={20} /></span>
                  <h3 className={s.h3}>{r.t}</h3>
                  <p className={s.rl}>{r.l} {r.b}</p>
                  <ul className={s.checks}>{r.items.map((x) => <li key={x}>✓ {x}</li>)}</ul>
                  <Link href={SIGN_UP} className={s.link}>{r.cta} <span>↗</span></Link>
                </div>
              </article>
            ))}
          </div>
          <p className={s.own}>Own land? There’s a place for that, too. <a href="#landvault" className={s.underline}>Discover LandVault ↗</a></p>
        </section>

        {/* BIGGER PICTURE */}
        <section className={`${s.wrap} ${s.sec} ${s.split}`}>
          <div>
            <Eyebrow c="A LITTLE LESS ADMIN" />
            <h2 className={s.h2l}>See the property. And the bigger picture.</h2>
            <p className={s.ledeL}>A home has a lot of moving parts. Bring the details, people, and everyday activity into one organized view.</p>
            <div className={s.list}>
              {perspective.map(([t, b, ic]) => (
                <div className={s.li} key={t}><span className={s.sqY}><Ic n={ic} size={17} /></span><div><h3>{t}</h3><p className={s.muted}>{b}</p></div></div>
              ))}
            </div>
            <a href="#features" className={s.btnO}>Take a closer look <span>↗</span></a>
          </div>
          <div className={s.yellowBox}>
            <div className={s.pcard}>
              <div className={s.pbar}><small><Ic n="building" size={13} /> Your properties <i>/ Emerald Court</i></small><span>···</span></div>
              <div className={s.photo} role="img" aria-label="Bright, contemporary apartment interior" />
              <div className={s.pbody}>
                <div className={s.rowHead}><div><h3 className={s.h3m}>Emerald Court</h3><small className={s.muted}><Ic n="map" size={11} /> Lekki Phase 1, Lagos</small></div><span className={s.pillOk}>Active</span></div>
                <nav className={s.tabs}><b>Details</b><span>Units</span><span>Tenants</span><span>Activity</span></nav>
                <div className={s.info}><div><small>Property type</small>Apartment</div><div><small>Total units</small>20 units</div><div><small>Occupancy</small>90%</div></div>
                <div className={s.bar}><i style={{ width: "90%" }} /></div>
                <div className={s.rowHead}><div className={s.rowStart}><Ic n="file" size={20} /><div><b>Property documents</b><small className={s.muted}>Lease agreements, records, and more</small></div></div><span>↗</span></div>
              </div>
            </div>
            <span className={`${s.float} ${s.fl3}`}><i className={s.dotS}><Ic n="shield" size={16} /></i><span><b>A place for every detail.</b><small className={s.muted}>And a little peace of mind for you.</small></span></span>
          </div>
        </section>

        {/* LANDVAULT */}
        <section id="landvault" className={s.dark}>
          <div className={s.dwrap}>
            <div className={s.dhead2}>
              <div>
                <Eyebrow c="INTRODUCING LANDVAULT" icon="map" />
                <h2 className={s.h2w}>Your land. A record that stays.</h2>
              </div>
              <div className={s.dtxt}>
                <p>Give your land records a home. Register your land, submit ownership documents, and follow the review process—all in one dedicated space.</p>
                <Link href={SIGN_UP} className={s.btnY}>Explore LandVault <span>↗</span></Link>
              </div>
            </div>
            <div className={s.panel}>
              <div className={s.steps}>{lvSteps.map((t, i) => <span key={t} className={i === 3 ? s.stepOn : ""}><small>0{i + 1}</small>{t}<Ic n="check" size={11} /></span>)}</div>
              <div className={s.stageDark}>
                <div className={s.recCard}>
                  <div className={s.rcHead}><b><Ic n="map" /> LandVault</b><small className={s.muted}>LV • 2026 • 0042</small></div>
                  <div className={s.rcBody}>
                    <small className={s.cap}>LAND OWNERSHIP RECORD</small>
                    <div className={s.rowHead}><h3 className={s.h3m}>Oakwood Plot 24</h3><span className={s.pillOk}>✓ Verified</span></div>
                    <small className={s.muted}><Ic n="map" size={12} /> Ibeju-Lekki, Lagos</small>
                    <dl className={s.dl}>
                      <div><dt>Registered owner</dt><dd>Adebayo Okonkwo</dd></div><div><dt>Land area</dt><dd>600 m²</dd></div>
                      <div><dt>Property reference</dt><dd>LV-LAG-0024</dd></div><div><dt>Registration date</dt><dd>22 September 2026</dd></div>
                    </dl>
                    <div className={s.docs}>
                      <small className={s.cap}>SUPPORTING DOCUMENTS</small>
                      <div className={s.row}><Ic n="file" size={13} /><span>Survey plan.pdf</span><em className={s.ok}>✓ Reviewed</em></div>
                      <div className={s.row}><Ic n="file" size={13} /><span>Ownership document.pdf</span><em className={s.ok}>✓ Reviewed</em></div>
                    </div>
                  </div>
                  <div className={s.rcFoot}><small>Record status</small><small>Verified · Active</small></div>
                </div>
                <div className={s.done}>
                  <span className={s.bigCheck}><Ic n="check" size={27} /></span>
                  <small className={s.capL}>STEP 04 / 04</small>
                  <h3>Recorded. Reviewed. Ready.</h3>
                  <p>Return to your reviewed land record and supporting documents whenever you need them.</p>
                  <div className={s.bar2}><i /></div>
                  <div className={s.rowHead}><small>Review complete</small><small>100%</small></div>
                </div>
              </div>
              <div className={s.pfoot}><span className={s.il}><i />An illustrative look at the LandVault process</span><span className={s.play}>▶ Play walkthrough</span></div>
            </div>
            <div className={s.dfoot}>
              <p>Your documents, organized. Your record, easy to return to.</p>
              <small>“Verified” reflects the platform’s record review. It does not replace legal proof of ownership.</small>
            </div>
          </div>
        </section>

        {/* HOW */}
        <section id="how" className={`${s.wrap} ${s.sec} ${s.ctr}`}>
          <Eyebrow c="FROM YOUR FIRST HELLO" center />
          <h2 className={s.h2}>A few steps. A lot more clarity.</h2>
          <p className={s.lede}>Start where you are. Bring the rest together.</p>
          <ol className={s.how}>
            {how.map(([t, b], i) => (
              <li key={t}><span className={s.num}>0{i + 1}</span><h3>{t}</h3><p className={s.muted}>{b}</p></li>
            ))}
          </ol>
        </section>

        {/* FEATURES */}
        <section id="features" className={`${s.wrap} ${s.sec}`}>
          <div className={s.fhead}>
            <div><Eyebrow c="THOUGHTFULLY CONNECTED" /><h2 className={s.h2l}>All the details. One less thing to juggle.</h2></div>
            <p className={s.ledeL}>From the first listing to the latest update, keep the things that matter close.</p>
          </div>
          <div className={s.grid}>
            {features.map(([t, b, ic]) => (
              <article key={t} className={t === "LandVault" ? s.hl : ""}>
                <span className={s.sqF}><Ic n={ic} size={20} /></span>
                <h3>{t}{t === "LandVault" && <em className={s.new}>NEW</em>}</h3>
                <p className={s.muted}>{b}</p>
              </article>
            ))}
          </div>
        </section>

        {/* REAL LIFE */}
        <section className={`${s.wrap} ${s.sec} ${s.ctr}`}>
          <Eyebrow c="MADE FOR REAL LIFE" center />
          <h2 className={s.h2}>Your world. Within reach.</h2>
          <p className={s.lede}>A clear overview at your desk. The details with you on the go.</p>
          <div className={s.rl2}>
            <div className={s.blue2}>
              <small className={s.eyebrow2}><Ic n="home" size={16} /> A LITTLE CLOSER TO HOME</small>
              <h3 className={s.h3x}>Your day, simplified.</h3>
              <div className={s.phone} aria-label="Aviritech tenant mobile dashboard">
                <div className={s.screen}>
                  <div className={s.screenPortrait} role="img" aria-label="Aviritech mobile dashboard" />
                  <div className={s.screenProperty} role="img" aria-label="Emerald Court property" />
                </div>
              </div>
              <span className={`${s.float} ${s.fl4}`}><Ic n="home" size={17} /> Your home, at hand.</span>
            </div>
            <div className={s.rcol}>
              <div className={s.wcard}>
                <nav className={s.ptabs}><b>Tenant management</b><span>Agent workspace</span></nav>
                <small className={s.cap}>PEOPLE & PROPERTY</small>
                <h3 className={s.h3x2}>Good connections. All in one place.</h3>
                {people.map(([i, n, u, st, w]) => (
                  <div className={s.row} key={n}><span className={s.avatar}>{i}</span><div><b>{n}</b><small className={s.muted}>{u}</small></div><span className={w ? s.pillWarn : s.pillOk}>{st}</span></div>
                ))}
              </div>
              <div className={s.loop}>
                <span className={s.bellC}><Ic n="bell" size={17} /></span>
                <h3 className={s.h3x2}>In the loop. On your terms.</h3>
                <p className={s.muted}>Make room for the updates that matter.</p>
                {[["Property activity", "Applications and important changes"], ["Maintenance updates", "Progress from request to resolution"]].map(([t, b]) => (
                  <div className={s.lrow} key={t}><div><b>{t}</b><small className={s.muted}>{b}</small></div><span className={s.toggle} aria-hidden><i /></span></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className={`${s.wrap} ${s.sec} ${s.ctr}`}>
          <Eyebrow c="CONFIDENCE IN THE DETAILS" center />
          <h2 className={s.h2t}>Thoughtful by design. Trust, at the foundation.</h2>
          <div className={s.trust}>
            {trust.map(([t, b, ic]) => (
              <article key={t}><span className={s.badge}><Ic n={ic} size={23} /></span><h3>{t}</h3><p className={s.muted}>{b}</p></article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className={s.cta}>
          <span className={s.star}>✳</span>
          <Eyebrow c="A PLACE FOR IT ALL" center />
          <h2 className={s.h2c}>Bring your property world together.</h2>
          <p>Manage properties. Connect people. Keep your land records organized with Aviritech Proptech.</p>
          <Link href={SIGN_UP} className={s.btnD}>Get started <span>↗</span></Link>
          <small>For landlords, tenants, agents, and landowners.</small>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.ftop}>
          <Logo />
          <p className={s.muted}>Property, perfectly connected.</p>
          <nav>{[["Product", "#product"], ["Solutions", "#solutions"], ["LandVault", "#landvault"], ["How it works", "#how"], ["Properties", "/properties"]].map(([n, h]) => <a key={n} href={h}>{n}</a>)}</nav>
        </div>
        <div className={s.fbot}><small>© 2026 Aviritech Proptech</small><a href="#top">Back to top ↑</a></div>
      </footer>
    </div>
  );
}
