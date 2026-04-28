import { EventsHeader } from "@/components/events-header";
import Footer from "@/components/footer";
import FAQSection from "@/components/faq-section";
import ContactSection from "@/components/contact-section";
export const metadata = {
  title: "Contact Us - ConveneHub",
  description:
    "Have questions? Get in touch with the ConveneHub team or browse our FAQ.",
};
export default function ContactPage() {
  return /*#__PURE__*/ React.createElement(
    "main",
    {
      className: "min-h-screen bg-white",
    },
    /*#__PURE__*/ React.createElement(EventsHeader, null),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "pt-16",
      },
      /*#__PURE__*/ React.createElement(FAQSection, null),
      /*#__PURE__*/ React.createElement(ContactSection, null),
    ),
    /*#__PURE__*/ React.createElement(Footer, null),
  );
}
