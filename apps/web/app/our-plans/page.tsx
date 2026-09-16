"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@daih/api-client";
import { FacilityResource } from "@daih/types";
import { Loader2 } from "lucide-react";

import { getWorkspaceImage } from "../../lib/image-utils";

function formatResourcePrice(resource: FacilityResource): string {
  if (resource.pricing && resource.pricing.length > 0) {
    const activePlans = resource.pricing.filter((p) => p.isActive !== false);
    const sorted = [...activePlans].sort(
      (a, b) => Number(a.price) - Number(b.price),
    );
    const first = sorted[0] || resource.pricing[0];
    const unit = first.durationMonths
      ? first.durationMonths === 12
        ? "/ Year"
        : first.durationMonths % 12 === 0
          ? `/${first.durationMonths / 12} Years`
          : first.durationMonths === 1
            ? "/ Month"
            : `/${first.durationMonths} Months`
      : first.durationDays
        ? first.durationDays === 1
          ? "/ Day"
          : `/${first.durationDays} Days`
        : first.durationHours
          ? first.durationHours === 1
            ? "/ Hour"
            : `/${first.durationHours} Hours`
          : "";
    return `₦${Number(first.price).toLocaleString()} ${unit}`.trim();
  }

  if (resource.dailyRate)
    return `₦${Number(resource.dailyRate).toLocaleString()} / Day`;
  if (resource.monthlyRate)
    return `₦${Number(resource.monthlyRate).toLocaleString()} / Month`;
  if (resource.hourlyRate)
    return `₦${Number(resource.hourlyRate).toLocaleString()} / Hour`;
  return "Contact Us";
}

export default function OurPlansPage() {
  const [resources, setResources] = useState<FacilityResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.catalogue
      .getResources()
      .then((data: FacilityResource[]) => {
        if (data && data.length > 0) {
          setResources(data);
        } else {
          setResources([]);
        }
      })
      .catch((err) => {
        setError(
          err?.message ||
            "Failed to fetch active workspace resources from database.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <>
      {/* Subheader */}
      <section
        id="subheader"
        className="text-light"
        style={{
          backgroundImage: "url(/images/background/subheader-2.jpg)",
          backgroundPosition: "top",
        }}
      >
        <div className="center-y relative text-center">
          <div className="container">
            <div className="row">
              <div className="col-md-12 text-center">
                <h1>Spaces Available</h1>
              </div>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Result Section */}
      <section id="section-result" className="pt50 pb50">
        <div className="container">
          {loading ? (
            <div className="py-24 text-center">
              <div className="d-flex justify-content-center align-items-center mb-3">
                <Loader2
                  className="animate-spin text-primary"
                  style={{ width: "40px", height: "40px" }}
                />
              </div>
              <p className="text-muted">
                Fetching live workspace plans directly from database...
              </p>
            </div>
          ) : error ? (
            <div className="alert alert-warning text-center my-4">
              <h4>Database Connection Notice</h4>
              <p>{error}</p>
            </div>
          ) : (
            <div className="row align-items-stretch">
              <div className="col-md-12">
                <h4>Showing {resources.length} Spaces Available</h4>
                <div className="spacer-40"></div>
              </div>

              {resources.map((resource) => {
                const imageSrc = getWorkspaceImage(
                  resource.slug,
                  resource.imageUrl,
                );
                const priceText = formatResourcePrice(resource);
                const href = `/${resource.slug}`;

                return (
                  <div
                    key={resource.id || resource.slug}
                    className="col-lg-4 col-md-6 mb30 d-flex"
                  >
                    <Link
                      href={href}
                      className="de-card s2 w-100 d-flex flex-column justify-content-between"
                      style={{ textDecoration: "none" }}
                    >
                      <div className="de-image flex-shrink-0">
                        <img
                          src={imageSrc}
                          className="img-fluid w-100"
                          alt={resource.name}
                          style={{ height: "220px", objectFit: "cover" }}
                        />
                      </div>
                      <div className="text d-flex flex-column flex-grow-1 p-4">
                        <h4>{resource.name}</h4>
                        <div className="de-rating mb-2">
                          <div className="p-rating">
                            <i className="fa fa-star checked"></i>
                            <i className="fa fa-star checked"></i>
                            <i className="fa fa-star checked"></i>
                            <i className="fa fa-star checked"></i>
                            <i className="fa fa-star checked"></i>
                            <span>(22)</span>
                          </div>
                        </div>
                        <ul className="ul-style-3 flex-grow-1 mb-4">
                          {(resource.amenities || []).map((amenity, idx) => (
                            <li key={idx}>{amenity}</li>
                          ))}
                        </ul>
                        <div
                          className="d-price mt-auto"
                          style={{
                            background: "transparent",
                            padding: "10px 0 0 0",
                          }}
                        >
                          <div style={{ color: "#717171", fontSize: "13px" }}>
                            Starting from
                          </div>
                          <span
                            style={{
                              color: "rgb(64, 64, 64)",
                              fontWeight: 800,
                              fontSize: "18px",
                              display: "inline-block",
                              marginTop: "2px",
                            }}
                          >
                            {priceText}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
