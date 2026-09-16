"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@daih/api-client";
import { FacilityResource } from "@daih/types";
import { Loader2 } from "lucide-react";
import { resolveResourceImageUrl } from "../../../lib/image-utils";
import { getPortalBookingUrl } from "../../../lib/config";

export default function DynamicWorkspacePage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const [resource, setResource] = useState<FacilityResource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.catalogue
      .getResourceBySlug(slug)
      .then((data: FacilityResource) => setResource(data))
      .catch(() => setResource(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted">Loading workspace details...</p>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="py-24 text-center">
        <h2>Workspace Not Found</h2>
        <p className="text-muted mt-2">
          The requested workspace "{slug}" does not exist in our active
          catalogue.
        </p>
        <Link href="/our-plans" className="btn-main mt-4 inline-block">
          View All Plans
        </Link>
      </div>
    );
  }

  const name = resource.name;
  const description =
    resource.description ||
    "Modern and flexible workspace equipped with enterprise-grade amenities.";
  const capacity = resource.capacity || 1;
  const location = resource.location || "DAIH Hub";
  const image = resolveResourceImageUrl(resource.imageUrl, resource.slug);
  const amenities =
    resource.amenities && resource.amenities.length > 0
      ? resource.amenities
      : [
          "High-Speed Internet / Wi-Fi",
          "24/7 Uninterrupted Power Supply",
          "Air Conditioning",
          "Ergonomic Workstations",
          "Complimentary Water & Coffee",
          "CCTV Security & Access Control",
        ];

  return (
    <>
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
                  <Link href={`/plans/${slug}`}>{name}</Link>
                </li>
              </ul>
              <h2 className="text-dark font-weight-bold">{name}</h2>
            </div>
            <div className="clearfix"></div>
          </div>
        </div>
      </section>

      <section aria-label="section" className="pt50 pb50">
        <div className="container">
          <div className="row">
            <div className="col-lg-8">
              <div className="mb30 rounded overflow-hidden shadow-sm bg-light">
                <img
                  src={image}
                  className="img-fluid w-100"
                  alt={name}
                  style={{
                    maxHeight: "420px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>

              <h3>Overview</h3>
              <p>{description}</p>
              <p className="text-muted small">
                <i className="fa fa-map-marker text-dark mr-1"></i> {location}{" "}
                &bull; <i className="fa fa-users text-dark mr-1 ml-2"></i>{" "}
                {capacity} Persons
              </p>

              <div className="spacer-single"></div>

              <h3>What is Included</h3>
              <ul className="ul-style-3 mb30">
                {amenities.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="col-lg-4">
              <div
                className="de-card s2 p-4 shadow-sm rounded sticky-top"
                style={{ top: "100px" }}
              >
                <h4>Pricing &amp; Booking</h4>
                <div className="spacer-10"></div>
                {resource?.pricing && resource.pricing.length > 0 ? (
                  <div className="space-y-3">
                    {resource.pricing.map((p: any) => (
                      <div
                        key={p.id}
                        className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2"
                      >
                        <span className="font-weight-bold">{p.planName}</span>
                        <span className="text-dark font-weight-bold">
                          ₦{Number(p.price).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted small">
                    Contact reception or select your plan online.
                  </p>
                )}

                <div className="spacer-20"></div>
                <a
                  href={getPortalBookingUrl(slug)}
                  className="btn-main w-100 text-center"
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
}
