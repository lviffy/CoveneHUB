import { EventsHeader } from "@/components/events-header";
export default function EventsLayout({ children }) {
  return /*#__PURE__*/ React.createElement(
    React.Fragment,
    null,
    /*#__PURE__*/ React.createElement(EventsHeader, null),
    children,
  );
}
