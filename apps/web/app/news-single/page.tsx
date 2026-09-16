"use client";

import React from "react";
import Link from "next/link";

export default function NewsSinglePage() {
  return (
    <>
      <section
        id="subheader"
        className="text-light"
        style={{
          backgroundImage: "url(/images/background/subheader-4.jpg)",
          backgroundPosition: "top",
          backgroundSize: "cover",
        }}
      >
        <div className="center-y relative text-center">
          <div className="container">
            <div className="row">
              <div className="col-md-12 text-center">
                <h1>Inviting Nature Into Your Workspace</h1>
                <p>February 10, 2026 • Workspace &amp; Wellness</p>
              </div>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="section">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="blog-read">
                <img
                  src="/images/news/news-1.jpg"
                  className="img-fluid rounded mb-4"
                  alt="Article image"
                />

                <h3>How Plants &amp; Natural Light Boost Focus</h3>
                <p>
                  Bringing elements of nature into your daily work
                  environment—also known as biophilic design—is proven to reduce
                  cortisol levels, enhance cognitive performance, and inspire
                  creative problem solving.
                </p>
                <p>
                  At Dare Adeboye Innovation Hub, our interior layout integrates
                  open sightlines, natural foliage, and large perimeter windows
                  to ensure your work hours feel refreshing rather than
                  draining.
                </p>

                <blockquote className="p-4 bg-light border-left my-4">
                  "Designing workspaces that honor natural ergonomics and
                  lighting transforms daily focus from an uphill battle into a
                  seamless flow."
                </blockquote>

                <h3>3 Quick Desk Adjustments for Today</h3>
                <ul>
                  <li>
                    Place a low-maintenance succulent or snake plant next to
                    your laptop stand.
                  </li>
                  <li>
                    Position your seat so that you catch natural indirect
                    daylight.
                  </li>
                  <li>
                    Schedule a 5-minute visual break every 90 minutes to stretch
                    and hydrate.
                  </li>
                </ul>

                <div className="mt-4 pt-3 border-top">
                  <Link href="/news" className="btn-main">
                    ← Back to News
                  </Link>
                </div>
              </div>
            </div>

            <div id="sidebar" className="col-lg-4">
              <div className="de-box mb-4">
                <h4>Recent Articles</h4>
                <ul className="list-unstyled mt-3">
                  <li className="mb-2">
                    <Link
                      href="/news-single"
                      className="text-dark font-weight-bold"
                    >
                      Tips to Help Boost Focus at Work
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link
                      href="/news-single"
                      className="text-dark font-weight-bold"
                    >
                      Tips to Improve Your Productivity
                    </Link>
                  </li>
                  <li className="mb-2">
                    <Link
                      href="/news-single"
                      className="text-dark font-weight-bold"
                    >
                      6 Creative Ways to Solve a Problem
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="de-box">
                <h4>Book a Space at DAIH</h4>
                <p className="small text-muted">
                  Experience our productive environment firsthand.
                </p>
                <Link
                  href="/our-plans"
                  className="btn-main btn-fullwidth text-center"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
