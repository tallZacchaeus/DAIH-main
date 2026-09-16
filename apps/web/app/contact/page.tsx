"use client";

import React, { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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
                <h1>Contact Us</h1>
              </div>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="section">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 mb-sm-30">
              <h3>Do you have any questions?</h3>
              <p className="contact-intro">
                Send us a message and our team will get back to you as soon as
                possible.
              </p>

              {submitted ? (
                <div className="alert alert-success p-4 rounded mb-4">
                  <strong>Thank you!</strong> Your message has been sent
                  successfully. Our team will contact you shortly.
                </div>
              ) : (
                <form
                  name="contactForm"
                  id="contact_form"
                  className="form-border"
                  onSubmit={handleSubmit}
                >
                  <div className="field-set mb-3">
                    <input
                      type="text"
                      name="name"
                      id="name"
                      className="form-control"
                      placeholder="Full Name"
                      required
                    />
                  </div>

                  <div className="field-set mb-3">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="form-control"
                      placeholder="Email Address"
                      required
                    />
                  </div>

                  <div className="field-set mb-3">
                    <input
                      type="text"
                      name="phone"
                      id="phone"
                      className="form-control"
                      placeholder="Phone Number"
                    />
                  </div>

                  <div className="field-set mb-3">
                    <textarea
                      name="message"
                      id="message"
                      className="form-control"
                      rows={5}
                      placeholder="Your Message"
                      required
                    ></textarea>
                  </div>

                  <div className="spacer-half"></div>

                  <div id="submit">
                    <input
                      type="submit"
                      id="send_message"
                      value="Submit Message"
                      className="btn btn-main"
                    />
                  </div>
                </form>
              )}
            </div>

            <div className="col-lg-4">
              <div className="padding40 bg-color text-light box-rounded">
                <h3>DAIH</h3>
                <address className="s1">
                  <span>
                    <i className="fa fa-map-marker fa-lg mr-2"></i> Abiona
                    Street By House of Favour, Main Gate, Obafemi Owode LGA,
                    Redemption City, Ogun State
                  </span>
                  <br />
                  <span>
                    <i className="fa fa-phone fa-lg mr-2"></i> 07042504389
                  </span>
                  <br />
                  <span>
                    <i className="fa fa-envelope-o fa-lg mr-2"></i>{" "}
                    <a
                      href="mailto:dareadeboyeinnovationhub@gmail.com"
                      className="text-white"
                    >
                      dareadeboyeinnovationhub@gmail.com
                    </a>
                  </span>
                </address>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
