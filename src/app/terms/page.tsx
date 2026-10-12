import legalContent from "@/components/home/legalContent";

export const metadata = { title: "Terms & Privacy | Ecominex" };

// Terms/Privacy page linked from the signup form; reuses the same legal text as the footer.
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-12">
        {Object.entries(legalContent).map(([title, content]) => (
          <section key={title} id={title.toLowerCase().replace(/\s+/g, "-")}>
            {content}
          </section>
        ))}
      </div>
    </main>
  );
}
