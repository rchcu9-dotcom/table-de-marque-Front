import { render, screen } from "@testing-library/react";
import Button from "../components/ds/Button";

test("render button", () => {
  render(<Button>OK</Button>);
  expect(screen.getByText("OK")).toBeInTheDocument();
});
