import { redirect } from "next/navigation";

// Human Review is tabled (Software_Timeline.md QA item): the feature isn't
// fully worked out yet, so it's hidden from the UI entirely -- no nav link,
// no dashboard card, and this route now just redirects away rather than
// rendering. The underlying data (review_requests table, /api/review-requests,
// HumanReviewCard, and the counselor-side review queue) is left in place
// since removing it isn't necessary to hide the feature and would be riskier
// to undo later.
export default function ReviewPage() {
  redirect("/dashboard");
}
