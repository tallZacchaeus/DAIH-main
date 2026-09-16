"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function JobsPage() {
  const [openJob, setOpenJob] = useState<number | null>(0);

  const jobs = [
    {
      title: "Project Manager",
      location: "Redemption City, Ogun",
      type: "Full-time",
      dept: "Operations",
      desc: "Lead hub initiatives, coordinate programs/events, and ensure smooth delivery of projects that support entrepreneurs, creators, and teams.",
      requirements: [
        "3+ years experience managing projects or programs",
        "Strong planning, reporting, and stakeholder management",
        "Excellent communication and team coordination",
        "Ability to multitask and deliver under deadlines",
        "Proficiency with tools like Google Workspace / Trello / Asana",
      ],
      offer: [
        "A mission-driven environment supporting innovation",
        "Opportunity to lead impactful programs",
        "Professional growth and learning opportunities",
        "Friendly, collaborative team culture",
        "Access to DAIH facilities and community events",
      ],
      subject: "Job Application - Project Manager (DAIH)",
    },
    {
      title: "Front-end Developer",
      location: "Hybrid",
      type: "Contract / Part-time",
      dept: "Engineering",
      desc: "Build and maintain user-friendly web pages for DAIH programs, bookings, and community updates. Strong attention to UI details is a plus.",
      requirements: [
        "Strong HTML, CSS, JavaScript, React / Next.js skills",
        "Experience with responsive frameworks and modern styling",
        "Comfortable working with existing design templates and brand tokens",
        "Basic understanding of SEO and performance",
        "Portfolio or examples of past work",
      ],
      offer: [
        "Flexible work arrangement",
        "Clear tasks and quick feedback loops",
        "Opportunity to improve a real product used by customers",
        "Supportive team collaboration",
        "Access to DAIH community events",
      ],
      subject: "Job Application - Front-end Developer (DAIH)",
    },
    {
      title: "Community & Front Desk Officer",
      location: "Redemption City (On-site)",
      type: "Full-time",
      dept: "Customer Experience",
      desc: "Be the welcoming face of DAIH, assisting visitors, managing desk check-ins, answering inquiries, and ensuring an excellent member experience.",
      requirements: [
        "Excellent verbal and written communication skills",
        "Warm, professional, and customer-centric personality",
        "Basic computer proficiency for logs and spreadsheets",
        "Punctual, organized, and proactive",
      ],
      offer: [
        "Engaging work environment meeting inspiring founders daily",
        "Competitive compensation and on-site perks",
        "Career development in facility and community management",
        "Access to learning programs and masterclasses",
      ],
      subject: "Job Application - Community Officer (DAIH)",
    },
  ];

  return (
    <>
      <section
        id="subheader"
        className="text-light"
        style={{
          backgroundImage: "url(/images/background/subheader.jpg)",
          backgroundPosition: "top",
          backgroundSize: "cover",
        }}
      >
        <div className="center-y relative text-center">
          <div className="container">
            <div className="row">
              <div className="col-md-12 text-center">
                <h1>Jobs</h1>
                <p>
                  Join the team building innovation, community, and productivity
                  at DAIH.
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
            <div className="col-md-10 offset-md-1">
              {/* How to Apply */}
              <div className="apply-note bg-color-secondary text-light p-4 rounded mb-4">
                <h4>How to Apply</h4>
                <p className="mb-0">
                  Send your CV and a short cover letter to{" "}
                  <a
                    className="text-light"
                    style={{ textDecoration: "underline" }}
                    href="mailto:dareadeboyeinnovationhub@gmail.com?subject=Job%20Application%20-%20DAIH"
                  >
                    dareadeboyeinnovationhub@gmail.com
                  </a>
                  . Use the job title as your email subject. You can also reach
                  us via the{" "}
                  <Link
                    className="text-light"
                    style={{ textDecoration: "underline" }}
                    href="/contact"
                  >
                    Contact page
                  </Link>
                  .
                </p>
              </div>

              <div className="expand-list">
                {jobs.map((job, idx) => {
                  const isOpen = openJob === idx;
                  return (
                    <div
                      key={idx}
                      className="expand-custom mb-4 border rounded p-4 bg-white"
                    >
                      <div
                        className="ec-header d-flex justify-content-between align-items-center cursor-pointer"
                        onClick={() => setOpenJob(isOpen ? null : idx)}
                      >
                        <div>
                          <h4>{job.title}</h4>
                          <div className="job-meta text-muted small">
                            <span className="mr-3">
                              <i className="fa fa-map-marker mr-1"></i>{" "}
                              {job.location}
                            </span>
                            <span className="mr-3 ml-2">
                              <i className="fa fa-clock-o mr-1"></i> {job.type}
                            </span>
                            <span className="ml-2">
                              <i className="fa fa-briefcase mr-1"></i>{" "}
                              {job.dept}
                            </span>
                          </div>
                          <p className="mt-2 mb-0">{job.desc}</p>
                        </div>
                        <div className="text-end">
                          <button className="btn btn-sm btn-outline-secondary">
                            {isOpen ? "− Hide" : "+ Details"}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="details mt-4 pt-3 border-top">
                          <div className="row">
                            <div className="col-md-6 mb-3">
                              <div className="box-custom">
                                <h5>Requirements</h5>
                                <ul className="list-unstyled">
                                  {job.requirements.map((r, i) => (
                                    <li key={i} className="mb-1">
                                      <i className="fa fa-check text-success mr-2"></i>{" "}
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="col-md-6 mb-3">
                              <div className="box-custom">
                                <h5>What We Offer</h5>
                                <ul className="list-unstyled">
                                  {job.offer.map((o, i) => (
                                    <li key={i} className="mb-1">
                                      <i className="fa fa-check text-success mr-2"></i>{" "}
                                      {o}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="col-md-12 mt-2">
                              <a
                                href={`mailto:dareadeboyeinnovationhub@gmail.com?subject=${encodeURIComponent(job.subject)}`}
                                className="btn-main"
                              >
                                Apply Now
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
