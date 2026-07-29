"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import type { ReviewData } from "./mockReviews"

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className="material-symbols-outlined"
          style={{
            fontSize: "13px",
            color: star <= rating ? "#f59e0b" : "#233748",
            fontVariationSettings: star <= rating ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          star
        </span>
      ))}
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

interface ReviewCardProps {
  review: ReviewData
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [isLiked, setIsLiked] = useState(review.isLiked)
  const [isSaved, setIsSaved] = useState(review.isSaved)
  const [likeCount, setLikeCount] = useState(review.likeCount)
  const [currentImageIdx, setCurrentImageIdx] = useState(0)

  const toggleLike = useCallback(() => {
    setIsLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1))
      return !prev
    })
  }, [])

  const toggleSave = useCallback(() => setIsSaved((prev) => !prev), [])

  const handleShare = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: review.location.name,
        text: review.text.slice(0, 100),
      }).catch(() => {})
    }
  }, [review])

  const hasMultipleImages = review.images.length > 1

  return (
    <motion.article
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      style={{
        background: "rgba(0,21,37,1)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 2px 16px rgba(0,0,0,0.25)",
        transition: "border-color 0.3s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)"
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)"
      }}
    >
      {/* ── Card Body ── */}
      <div style={{ padding: "16px 20px 0" }}>
        {/* Reviewer Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "9999px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  overflow: "hidden",
                  background: "#111820",
                }}
              >
                <img
                  src={review.reviewer.avatarUrl}
                  alt={review.reviewer.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              </div>
              {review.reviewer.verified && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "9999px",
                    background: "#10b981",
                    border: "2px solid #001525",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "9px", color: "#003824", fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                </div>
              )}
            </div>

            {/* Reviewer Info */}
            <div>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#f0f4f8",
                  lineHeight: 1.2,
                }}
              >
                {review.reviewer.name}
              </p>
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "#4a6380",
                  marginTop: "2px",
                  letterSpacing: "0.04em",
                }}
              >
                {review.reviewer.role}
              </p>
            </div>
          </div>

          {/* More options */}
          <button
            type="button"
            style={{ color: "#4a6380", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
            aria-label="More options"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              more_horiz
            </span>
          </button>
        </div>

        {/* Location + Rating Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "13px", color: "#4edea3" }}>
              location_on
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "12px",
                fontWeight: 500,
                color: "#4edea3",
              }}
            >
              {review.location.name}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                color: "#4a6380",
                background: "rgba(255,255,255,0.05)",
                padding: "1px 6px",
                borderRadius: "4px",
                letterSpacing: "0.04em",
              }}
            >
              {review.location.zone}
            </span>
          </div>
          <StarRating rating={review.rating} />
        </div>

        {/* Review Text */}
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "14px",
            color: "#bbcabf",
            lineHeight: "20px",
            marginBottom: "14px",
          }}
        >
          {review.text}
        </p>
      </div>

      {/* ── Hero Image / Media ── */}
      {review.images.length > 0 && (
        <div style={{ position: "relative", overflow: "hidden", marginBottom: "0" }}>
          <div
            style={{
              aspectRatio: review.images.length === 1 ? "4/5" : "4/3",
              overflow: "hidden",
              position: "relative",
              background: "#1a2332",
            }}
          >
            <img
              src={review.images[currentImageIdx]}
              alt={review.location.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "transform 0.7s ease",
                display: "block",
              }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80"
              }}
            />

            {/* LIVE STATUS badge */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(0,15,29,0.60)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                padding: "4px 12px",
                borderRadius: "9999px",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "9999px",
                  background: "#4edea3",
                  animation: "breathe 2.4s infinite ease-in-out",
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "#4edea3",
                  letterSpacing: "0.04em",
                  fontWeight: 500,
                }}
              >
                LIVE STATUS
              </span>
            </div>

            {/* Image pagination dots */}
            {hasMultipleImages && (
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: "5px",
                }}
              >
                {review.images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentImageIdx(i)}
                    style={{
                      width: i === currentImageIdx ? "18px" : "6px",
                      height: "6px",
                      borderRadius: "9999px",
                      background: i === currentImageIdx ? "#4edea3" : "rgba(255,255,255,0.30)",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "width 0.2s ease, background 0.2s ease",
                    }}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Action Bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px 16px",
        }}
      >
        {/* Left: Like + Comment + Share */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Like */}
          <button
            type="button"
            onClick={toggleLike}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isLiked ? "#4edea3" : "#4a6380",
              transition: "color 0.2s ease",
              padding: 0,
            }}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "22px",
                fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0",
                transition: "transform 0.15s ease",
              }}
            >
              favorite
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
              }}
            >
              {formatCount(likeCount)}
            </span>
          </button>

          {/* Comment */}
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#4a6380",
              padding: 0,
            }}
            aria-label="Comments"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
              chat_bubble
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
              }}
            >
              {formatCount(review.commentCount)}
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#4a6380",
              padding: 0,
            }}
            aria-label="Share"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
              send
            </span>
          </button>
        </div>

        {/* Right: Save / Bookmark */}
        <button
          type="button"
          onClick={toggleSave}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: isSaved ? "#ffb95f" : "#4a6380",
            transition: "color 0.2s ease",
            padding: 0,
          }}
          aria-label={isSaved ? "Unsave" : "Save"}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: "22px",
              fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0",
            }}
          >
            bookmark
          </span>
        </button>
      </div>
    </motion.article>
  )
}
