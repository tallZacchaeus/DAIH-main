"use client";

import React from "react";
import Link from "next/link";

export default function EventsPage() {
  const events = [
    {
      title: "Jump Start Your Business",
      desc: "A practical session for founders and business owners—strategy, structure, and execution.",
      img: "/images/events/news-1.jpg",
      month: "Mar",
      day: "14",
      year: "2026",
    },
    {
      title: "Web Development Meetup",
      desc: "Connect with developers and creators—talks, networking, and community collaboration.",
      img: "/images/events/news-2.jpg",
      month: "Apr",
      day: "05",
      year: "2026",
    },
    {
      title: "DAIH Community Session",
      desc: "Join a high-impact community session focused on growth, mentorship, and support.",
      img: "/images/events/news-3.jpg",
      month: "May",
      day: "20",
      year: "2026",
    },
    {
      title: "Design & Creativity Meetup",
      desc: "A meetup for designers and creatives—ideas, feedback, and portfolio growth.",
      img: "/images/events/news-4.jpg",
      month: "Jun",
      day: "11",
      year: "2026",
    },
    {
      title: "Marketing & Growth Masterclass",
      desc: "Actionable marketing and customer acquisition strategies for modern businesses.",
      img: "/images/events/news-5.jpg",
      month: "Jul",
      day: "08",
      year: "2026",
    },
    {
      title: "Product Launch & Demo Day",
      desc: "Watch innovative teams demo their products and connect with potential collaborators.",
      img: "/images/events/news-6.jpg",
      month: "Aug",
      day: "22",
      year: "2026",
    },
  ];

  return (
    <>
      <section
        id="subheader"
        className="text-light"
        style={{
          backgroundImage: "url(/images/background/subheader-5.jpg)",
          backgroundPosition: "top",
          backgroundSize: "cover",
        }}
      >
        <div className="center-y relative text-center">
          <div className="container">
            <div className="row">
              <div className="col-md-12 text-center">
                <h1>Events</h1>
                <p className="mb-0">
                  Meetups • Workshops • Masterclasses • Community Sessions
                </p>
              </div>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <div className="events-intro mb-4">
                <h2 className="mb-2">Upcoming at DAIH</h2>
                <p className="mb-0">
                  Explore our upcoming events designed to help you learn,
                  connect, and grow—right in the heart of Redemption City, Ogun
                  State.
                </p>
              </div>
            </div>
          </div>

          <div className="row events-filter mb-4">
            <div className="col-12">
              <div className="events-filter-bar d-flex justify-content-between align-items-center p-3 bg-light rounded">
                <div className="events-filter-location">
                  <strong>Location:</strong> Redemption City, Ogun State
                </div>
                <div className="events-filter-action">
                  <Link href="/contact" className="btn-main btn-sm">
                    Host an Event
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {events.map((event, idx) => (
              <div key={idx} className="col-lg-4 col-md-6 mb30">
                <div className="de-event-item">
                  <div className="d-content">
                    <div className="d-image">
                      <span className="d-image-wrap">
                        <img
                          alt={event.title}
                          src={event.img}
                          className="img-fluid"
                        />
                      </span>
                      <span className="d-date">
                        <span className="d-mm">{event.month}</span>
                        <span className="d-dd">{event.day}</span>
                        <span className="d-yy">{event.year}</span>
                      </span>
                      <span className="d-shadow"></span>
                      <span className="d-location">
                        <i className="fa fa-map-marker id-color-2 mr-1"></i>{" "}
                        Redemption City, Ogun State
                      </span>
                    </div>
                    <div className="d-text">
                      <h4>{event.title}</h4>
                      <p>{event.desc}</p>
                      <Link className="btn-main" href="/event-single">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
