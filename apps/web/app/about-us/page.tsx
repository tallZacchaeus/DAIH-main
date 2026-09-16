"use client";

import React from "react";
import Link from "next/link";

export default function AboutUsPage() {
  return (
    <>
      <section
        id="subheader"
        className="text-light"
        style={{
          backgroundImage: "url(/images/background/subheader-3.jpg)",
          backgroundPosition: "top",
          backgroundSize: "cover",
        }}
      >
        <div className="center-y relative text-center">
          <div className="container">
            <div className="row">
              <div className="col-md-8 offset-md-2 text-center">
                <h1>About Dare Adeboye Innovation Hub</h1>
                <p className="lead mb0">
                  A coworking community where ideas thrive and collaborations
                  flourish.
                </p>
              </div>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <img
                src="/images/misc/images-set-3.png"
                className="img-fluid"
                alt="DAIH workspace"
              />
            </div>
            <div className="col-md-6">
              <h2>We do things differently</h2>
              <p>
                Dare Adeboye Innovation Hub (DAIH) is more than just a
                co-working space; it's a community where ideas thrive and
                collaborations flourish. Whether you're a freelancer, startup,
                or an established company, we provide flexible workspaces and
                the right environment to stay productive.
              </p>
              <p className="mt10">
                Nestled in the heart of Redemption City, Ogun State, our hub is
                strategically located on{" "}
                <strong>
                  Abiona Street by House of Favour, Main Gate, Obafemi Owode LGA
                </strong>
                . Experience the perfect blend of a professional workspace and a
                dynamic atmosphere that fosters creativity.
              </p>
            </div>
          </div>

          <div className="spacer-triple"></div>

          {/* Counters */}
          <div className="row">
            <div
              className="col-lg-3 col-md-6 col-sm-6 wow fadeInRight mb30"
              data-wow-delay=".1s"
            >
              <div className="de_count s2 text-center">
                <h3>
                  <span>150</span>+
                </h3>
                <h5 className="id-color">Seats Available</h5>
              </div>
            </div>

            <div
              className="col-lg-3 col-md-6 col-sm-6 wow fadeInRight mb30"
              data-wow-delay=".2s"
            >
              <div className="de_count s2 text-center">
                <h3>
                  <span>7</span>+
                </h3>
                <h5 className="id-color">Workspace Options</h5>
              </div>
            </div>

            <div
              className="col-lg-3 col-md-6 col-sm-6 wow fadeInRight mb30"
              data-wow-delay=".3s"
            >
              <div className="de_count s2 text-center">
                <h3>
                  <span>24</span>/7
                </h3>
                <h5 className="id-color">Power &amp; Security</h5>
              </div>
            </div>

            <div
              className="col-lg-3 col-md-6 col-sm-6 wow fadeInRight mb30"
              data-wow-delay=".4s"
            >
              <div className="de_count s2 text-center">
                <h3>
                  <span>100</span>+
                </h3>
                <h5 className="id-color">Community Members</h5>
              </div>
            </div>
          </div>

          <div className="spacer-single"></div>

          <div className="row">
            <div className="col-md-6 offset-md-3 text-center">
              <h2>Spaces designed for productivity</h2>
              <p>
                Enjoy ergonomic furniture, reliable high-speed internet, meeting
                rooms, and a collaborative environment built to help you work
                better and connect with like-minded professionals.
              </p>
            </div>

            <div className="spacer-10"></div>

            <div className="col-md-12">
              <div className="row">
                <div className="col-md-4 mb-4">
                  <img
                    src="/images/misc/is-1.jpg"
                    className="img-fluid rounded"
                    alt="DAIH space 1"
                  />
                </div>
                <div className="col-md-4 mb-4">
                  <img
                    src="/images/misc/is-2.jpg"
                    className="img-fluid rounded"
                    alt="DAIH space 2"
                  />
                </div>
                <div className="col-md-4 mb-4">
                  <img
                    src="/images/misc/is-3.jpg"
                    className="img-fluid rounded"
                    alt="DAIH space 3"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="spacer-triple"></div>

          <div className="faq-header text-center mb-4">
            <h2>Frequently Asked Questions</h2>
            <p className="mb0">Quick answers to common questions.</p>
          </div>

          <div className="faq-content">
            <div className="faq-question">
              <input id="q1" type="checkbox" className="panel" />
              <div className="plus">+</div>
              <label htmlFor="q1" className="panel-title">
                Where is DAIH located?
              </label>
              <div className="panel-content">
                We are located at Abiona Street by House of Favour, Main Gate,
                Obafemi Owode LGA, Redemption City, Ogun State.
              </div>
            </div>

            <div className="faq-question">
              <input id="q2" type="checkbox" className="panel" />
              <div className="plus">+</div>
              <label htmlFor="q2" className="panel-title">
                What workspaces do you offer?
              </label>
              <div className="panel-content">
                We offer Hot Desks, Dedicated Desks, Office Suites, Private
                Offices, Conference Rooms, and Training Rooms. Lounge and Studio
                spaces are coming soon.
              </div>
            </div>

            <div className="faq-question">
              <input id="q3" type="checkbox" className="panel" />
              <div className="plus">+</div>
              <label htmlFor="q3" className="panel-title">
                Do you have stable power and internet?
              </label>
              <div className="panel-content">
                Yes. We provide 24/7 power supply and high-speed internet
                (available on applicable plans).
              </div>
            </div>

            <div className="faq-question">
              <input id="q4" type="checkbox" className="panel" />
              <div className="plus">+</div>
              <label htmlFor="q4" className="panel-title">
                How do I book a space?
              </label>
              <div className="panel-content">
                Click “Book A Space” on the website or contact us directly to
                reserve a desk, office, or room.
              </div>
            </div>

            <div className="faq-question">
              <input id="q5" type="checkbox" className="panel" />
              <div className="plus">+</div>
              <label htmlFor="q5" className="panel-title">
                How can I contact DAIH?
              </label>
              <div className="panel-content">
                Email:{" "}
                <a href="mailto:dareadeboyeinnovationhub@gmail.com">
                  dareadeboyeinnovationhub@gmail.com
                </a>
                <br />
                Phone: <a href="tel:+2347042504389">07042504389</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
