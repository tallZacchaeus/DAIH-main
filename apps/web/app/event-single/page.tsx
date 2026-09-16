"use client";

import React from "react";
import Link from "next/link";
import { getPortalBookingUrl } from "../../lib/config";

export default function EventSinglePage() {
  return (
    <>
      <section id="subheader" className="s2">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <ul className="crumb">
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/events">Events</Link>
                </li>
                <li>
                  <span>Event Details</span>
                </li>
              </ul>
              <h2>DAIH Community Meetup &amp; Workshop</h2>
            </div>
            <div className="clearfix"></div>
          </div>
        </div>
      </section>

      <section aria-label="section">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="mb30 rounded overflow-hidden shadow-sm bg-light">
                <img
                  src="/images/event-details-slider/1.jpg"
                  className="img-fluid rounded w-100"
                  alt="DAIH Event"
                  style={{
                    maxHeight: "440px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>

              <div className="spacer-single"></div>

              <h3>Event Overview</h3>
              <p>
                Join us at Dare Adeboye Innovation Hub (DAIH) for an engaging
                session designed to inspire, connect, and equip you with
                practical insights. Expect meaningful conversations, real
                learning, and opportunities to network with professionals,
                founders, and creatives.
              </p>
              <p className="mb-0">
                <strong>What to expect:</strong> Keynotes, fireside discussions,
                live Q&amp;A, interactive workshops, and high-value networking.
              </p>

              <div className="spacer-single"></div>

              <h3>Speakers</h3>
              <div className="row">
                <div className="col-lg-6 col-md-6 mb-4">
                  <div className="f-box f-icon-left f-icon-rounded border p-3 rounded">
                    <i className="fa fa-user bg-color text-light"></i>
                    <div className="fb-text">
                      <h4>Guest Speaker 1</h4>
                      <p className="text-muted mb-0">
                        Tech &amp; Innovation Lead
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-lg-6 col-md-6 mb-4">
                  <div className="f-box f-icon-left f-icon-rounded border p-3 rounded">
                    <i className="fa fa-user bg-color text-light"></i>
                    <div className="fb-text">
                      <h4>Guest Speaker 2</h4>
                      <p className="text-muted mb-0">
                        Startup &amp; Growth Strategist
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                className="de-card s2 p-4 shadow-sm rounded sticky-top"
                style={{ top: "100px" }}
              >
                <h4>Event Details</h4>
                <div className="spacer-10"></div>

                <ul className="list-unstyled mb-0">
                  <li className="d-flex align-items-center py-2 border-bottom">
                    <i className="fa fa-calendar mr-2 text-dark"></i>
                    <span>
                      <strong>Date:</strong> Saturday, Nov 22, 2025
                    </span>
                  </li>
                  <li className="d-flex align-items-center py-2 border-bottom">
                    <i className="fa fa-clock-o mr-2 text-dark"></i>
                    <span>
                      <strong>Time:</strong> 10:00 AM - 2:00 PM
                    </span>
                  </li>
                  <li className="d-flex align-items-center py-2 border-bottom">
                    <i className="fa fa-map-marker mr-2 text-dark"></i>
                    <span>
                      <strong>Venue:</strong> Conference Hall, DAIH
                    </span>
                  </li>
                  <li className="d-flex align-items-center py-2">
                    <i className="fa fa-ticket mr-2 text-dark"></i>
                    <span>
                      <strong>Access:</strong> Free (RSVP Required)
                    </span>
                  </li>
                </ul>

                <div className="spacer-20"></div>

                <a
                  href={getPortalBookingUrl()}
                  className="btn-main w-100 text-center py-3 font-weight-bold d-block"
                  style={{ textDecoration: "none" }}
                >
                  Register for Event
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
