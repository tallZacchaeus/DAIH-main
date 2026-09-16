"use client";

import React from "react";

export default function GalleryPage() {
  const items = [
    {
      title: "Workspace Moments",
      img: "/images/gallery/gallery-item-1.jpg",
      col: "col-md-4",
    },
    {
      title: "Community & Collaboration",
      img: "/images/gallery/gallery-item-2.jpg",
      col: "col-md-4",
    },
    {
      title: "Dedicated Desks",
      img: "/images/gallery/gallery-item-3.jpg",
      col: "col-md-4",
    },
    {
      title: "Hot Desk Area",
      img: "/images/gallery/gallery-item-4.jpg",
      col: "col-md-4",
    },
    {
      title: "Meetings & Sessions",
      img: "/images/gallery/gallery-item-5.jpg",
      col: "col-md-4",
    },
    {
      title: "Training & Workshops",
      img: "/images/gallery/gallery-item-6.jpg",
      col: "col-md-8",
    },
    {
      title: "Events at DAIH",
      img: "/images/gallery/gallery-item-7.jpg",
      col: "col-md-4",
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
                <h1>Gallery</h1>
                <p className="mb-0">
                  A glimpse into our spaces, community, and moments at DAIH.
                </p>
              </div>
              <div className="clearfix"></div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="section">
        <div className="container">
          <div id="gallery" className="row">
            {items.map((item, idx) => (
              <div key={idx} className={`${item.col} item mb-4`}>
                <div className="de-image-hover rounded">
                  <a
                    href={item.img}
                    className="image-popup"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="dih-title-wrap">
                      <span className="dih-title">{item.title}</span>
                    </span>
                    <span className="dih-overlay"></span>
                    <img
                      src={item.img}
                      className="img-fluid rounded"
                      alt={item.title}
                    />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
