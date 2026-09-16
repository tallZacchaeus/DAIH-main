"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@daih/api-client";
import { PolicyDocument } from "@daih/types";
import { Shield, ShieldCheck, Loader2 } from "lucide-react";

export default function WebPrivacyPage() {
  const [policy, setPolicy] = useState<PolicyDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.policies
      .getByType("PRIVACY_POLICY")
      .then((data) => {
        if (isMounted) setPolicy(data);
      })
      .catch((err) => {
        console.warn("Could not load Privacy Policy:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {/* Subheader */}
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
                <h1>Privacy Policy</h1>
                <p className="lead text-white-50 mt-2">
                  Nigeria Data Protection Act (NDPA 2023) & NDPR Compliance
                  Notice.
                </p>
              </div>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section aria-label="section" className="py-5 bg-light">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10">
              <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border border-light-subtle">
                <div className="d-flex flex-wrap align-items-center justify-content-between pb-4 mb-4 border-bottom gap-2">
                  <div className="d-flex align-items-center gap-3">
                    <div className="rounded-3 p-3 text-white d-flex align-items-center justify-center bg-success">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="h4 mb-1 fw-bold text-dark">
                        {policy?.title || "DAIH Privacy Policy"}
                      </h2>
                      <div className="text-muted small">
                        <span>Version {policy?.version || "1.0"}</span>
                        <span className="mx-2">•</span>
                        <span>
                          Updated:{" "}
                          {policy?.updatedAt
                            ? new Date(policy.updatedAt).toLocaleDateString(
                                undefined,
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )
                            : "Current"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill border">
                    <ShieldCheck className="w-4 h-4 d-inline me-1" />
                    NDPR & NDPA 2023 Verified
                  </span>
                </div>

                {loading ? (
                  <div className="text-center py-5 text-muted">
                    <Loader2
                      className="w-8 h-8 animate-spin mx-auto mb-2"
                      style={{ color: "#23055c" }}
                    />
                    <p>Loading Privacy Policy...</p>
                  </div>
                ) : (
                  <div
                    className="policy-prose text-secondary"
                    style={{ whiteSpace: "pre-line", lineHeight: "1.75" }}
                  >
                    {policy?.content}
                  </div>
                )}

                <div className="mt-5 pt-4 border-top d-flex flex-wrap justify-content-between align-items-center gap-3 small text-muted">
                  <span>
                    © {new Date().getFullYear()} DAIH. All rights reserved.
                  </span>
                  <div className="d-flex gap-3">
                    <Link
                      href="/terms"
                      className="text-decoration-none fw-semibold"
                    >
                      Terms of Service
                    </Link>
                    <Link
                      href="/contact"
                      className="text-decoration-none fw-semibold"
                    >
                      Contact DPO
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
