"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@daih/api-client";
import { FacilityResource, ResourcePricingPlan } from "@daih/types";
import { Loader2 } from "lucide-react";
import { getWorkspaceImage } from "../lib/image-utils";
import { getPortalBookingUrl } from "../lib/config";

function getDurationLabel(plan: any): string {
  if (plan.durationMonths) {
    if (plan.durationMonths === 12) return "/ Year";
    if (plan.durationMonths % 12 === 0)
      return `/${plan.durationMonths / 12} Years`;
    return plan.durationMonths === 1
      ? "/ Month"
      : `/${plan.durationMonths} Months`;
  }
  if (plan.durationDays)
    return plan.durationDays === 1 ? "/ Day" : `/${plan.durationDays} Days`;
  if (plan.durationHours)
    return plan.durationHours === 1 ? "/ Hour" : `/${plan.durationHours} Hours`;
  return "";
}

interface WorkspaceDetailViewProps {
  slug: string;
}

export const WorkspaceDetailView: React.FC<WorkspaceDetailViewProps> = ({
  slug,
}) => {
  const [resource, setResource] = useState<FacilityResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.catalogue
      .getResourceBySlug(slug)
      .then((data: FacilityResource) => {
        if (data) {
          setResource(data);
        } else {
          setError(`Workspace '${slug}' not found.`);
        }
      })
      .catch((err: any) => {
        setError(
          err?.message || "Failed to load workspace details from database.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="d-flex justify-content-center align-items-center mb-3">
          <Loader2
            className="animate-spin text-primary"
            style={{ width: "40px", height: "40px" }}
          />
        </div>
        <p className="text-muted">
          Loading live workspace details from database...
        </p>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-warning my-5">
          <h4>Unable to Load Workspace</h4>
          <p>
            {error ||
              "This workspace is currently not available in the catalogue database."}
          </p>
          <Link href="/our-plans" className="btn-main mt-3">
            View All Available Plans
          </Link>
        </div>
      </div>
    );
  }

  const imageSrc = getWorkspaceImage(resource.slug, resource.imageUrl);

  return (
    <>
      {/* Subheader */}
      <section
        id="subheader"
        className="s2 bg-white"
        style={{
          backgroundColor: "#ffffff",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <ul className="crumb">
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/our-plans">Our Plans</Link>
                </li>
                <li>
                  <Link href={`/${resource.slug}`}>{resource.name}</Link>
                </li>
              </ul>
              <h2 className="text-dark font-weight-bold">{resource.name}</h2>
            </div>
            <div className="clearfix"></div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section aria-label="section" className="pt50 pb50">
        <div className="container">
          <div className="row">
            {/* Left Column: Image & Details */}
            <div className="col-lg-8">
              <div className="mb30 rounded overflow-hidden shadow-sm bg-light">
                <img
                  src={imageSrc}
                  className="img-fluid w-100"
                  alt={resource.name}
                  style={{
                    maxHeight: "440px",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = getWorkspaceImage(resource.slug, null);
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                />
              </div>

              <div className="de-price mb-4 p-4 bg-light rounded border">
                <h5 className="mb-2 text-dark font-weight-bold">
                  Live Pricing
                </h5>
                {resource.pricing && resource.pricing.length > 0 ? (
                  <ul className="price-list list-unstyled mb-0">
                    {resource.pricing.map((plan: ResourcePricingPlan) => (
                      <li
                        key={plan.id}
                        className="d-flex justify-content-between align-items-center py-2 border-bottom flex-wrap gap-2"
                      >
                        <span className="font-weight-bold">
                          {plan.planName}
                          {plan.isPopular && (
                            <span className="badge badge-primary ml-2">
                              POPULAR
                            </span>
                          )}
                        </span>
                        <span className="h5 text-dark mb-0 font-weight-bold">
                          ₦{Number(plan.price).toLocaleString()}{" "}
                          <span className="small text-muted font-weight-normal">
                            {getDurationLabel(plan)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted mb-0">
                    No active pricing tiers configured.
                  </p>
                )}
              </div>

              <div className="spacer-single"></div>

              <h3>Overview</h3>
              <p className="lead">{resource.description}</p>

              <div className="d-flex flex-wrap gap-4 text-muted mb-4 py-2 border-top border-bottom">
                <div className="mr-4">
                  <i className="fa fa-map-marker text-dark mr-1"></i>{" "}
                  {resource.location || "DAIH Campus, Redemption City"}
                </div>
                <div>
                  <i className="fa fa-users text-dark mr-1"></i>{" "}
                  {resource.capacity
                    ? `Up to ${resource.capacity} Persons`
                    : "1 Person"}
                </div>
              </div>

              <div className="spacer-single"></div>

              <h3>What is Included</h3>
              <ul className="ul-style-2 row">
                {(resource.amenities || []).map((item: string, idx: number) => (
                  <li key={idx} className="col-md-6 mb-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Sticky Booking Card */}
            <div className="col-lg-4">
              <div
                className="de-card s2 p-4 shadow-sm rounded sticky-top"
                style={{ top: "100px" }}
              >
                <h4 className="border-bottom pb-3">Reserve This Space</h4>
                <p className="text-muted small">
                  Instant reservation with guaranteed power, fast internet, and
                  access passes.
                </p>

                <div className="spacer-10"></div>

                <div className="mb-4">
                  <label className="small text-muted font-weight-bold text-uppercase">
                    Starting Rate
                  </label>
                  <div className="h3 text-dark font-weight-bold">
                    {resource.pricing && resource.pricing.length > 0 ? (
                      <>
                        ₦{Number(resource.pricing[0].price).toLocaleString()}
                        <span className="small text-muted font-weight-normal">
                          {" "}
                          {getDurationLabel(resource.pricing[0])}
                        </span>
                      </>
                    ) : (
                      "Contact Us"
                    )}
                  </div>
                </div>

                <div className="spacer-20"></div>

                <a
                  href={getPortalBookingUrl(resource.slug)}
                  className="btn-main w-100 text-center py-3 font-weight-bold d-block"
                  style={{ textDecoration: "none" }}
                >
                  Sign In to Book
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
