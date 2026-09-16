"use client";

import React from "react";
import Link from "next/link";

export default function NewsPage() {
  const articles = [
    {
      title: "Inviting Nature Into Your Workspace",
      tagline: "Workspace",
      date: "February 10, 2026",
      img: "/images/news/news-1.jpg",
      desc: "Plants, natural light, and simple desk setups can improve mood and reduce stress—here’s how to bring calm into your workday.",
    },
    {
      title: "Tips to Help Boost Focus at Work",
      tagline: "Productivity",
      date: "March 3, 2026",
      img: "/images/news/news-2.jpg",
      desc: "Try time-blocking, a deep-work routine, and notification control to protect your attention and get more meaningful work done.",
    },
    {
      title: "Tips to Improve Your Productivity",
      tagline: "Habits",
      date: "February 28, 2026",
      img: "/images/news/news-3.jpg",
      desc: "Small daily habits—planning, batching tasks, and quick end-of-day resets—can make your week feel lighter and more productive.",
    },
    {
      title: "6 Creative Ways to Solve a Problem",
      tagline: "Creativity",
      date: "February 22, 2026",
      img: "/images/news/news-4.jpg",
      desc: "When you’re stuck, change the frame—use mind-maps, rapid prototypes, and fresh perspectives to unlock solutions faster.",
    },
    {
      title: "10 Practical Ways to Find Your Next Role",
      tagline: "Career",
      date: "February 14, 2026",
      img: "/images/news/news-5.jpg",
      desc: "From building a portfolio to leveraging communities and networking, here are realistic steps to land roles that fit your goals.",
    },
    {
      title: "5 Ways to Maintain a Good Posture",
      tagline: "Wellness",
      date: "February 12, 2026",
      img: "/images/news/news-6.jpg",
      desc: "Simple desk ergonomics, frequent movement, and better chair setup can reduce fatigue and help you work comfortably for longer.",
    },
  ];

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
                <h1>News &amp; Articles</h1>
                <p>
                  Insights, updates, and productivity tips from the DAIH
                  community.
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
            {articles.map((art, idx) => (
              <div key={idx} className="col-lg-4 col-md-6 mb30">
                <div className="bloglist item h-100 bg-white border rounded overflow-hidden">
                  <div className="post-content p-3">
                    <div className="post-image mb-3">
                      <img
                        alt={art.title}
                        src={art.img}
                        className="img-fluid rounded"
                      />
                    </div>
                    <div className="post-text">
                      <span className="badge bg-secondary mb-2">
                        {art.tagline}
                      </span>
                      <div className="text-muted small mb-2">{art.date}</div>
                      <h4 className="mb-2">
                        <Link href="/news-single" className="text-dark">
                          {art.title}
                        </Link>
                      </h4>
                      <p className="text-muted small">{art.desc}</p>
                      <Link
                        className="btn-main btn-sm mt-2"
                        href="/news-single"
                      >
                        Read more
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
