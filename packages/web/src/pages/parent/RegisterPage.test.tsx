// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RegisterPage } from "./RegisterPage";

// api is an axios-style client ({ data }); useAuth supplies the logged-in user;
// i18n is stubbed to echo keys so assertions are language-independent.
const { apiMock } = vi.hoisted(() => ({
  apiMock: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("../../lib/api", () => ({ api: apiMock }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ user: { email: "john@x.co" } }) }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { changeLanguage: () => {} } }),
}));

type Fixtures = {
  profile?: Record<string, unknown>;
  children?: { childId: string; name: string; birthdate: string }[];
  event?: Record<string, unknown>;
  questions?: unknown[];
};

const defaults = {
  profile: { parentName: "John Doe", email: "john@x.co", parentPhone: "", heardAbout: "", consentPhotos: false, consentContact: false },
  children: [{ childId: "c1", name: "Ada Lovelace", birthdate: "2015-04-01" }],
  event: {
    eventId: "evt1",
    dojoId: "dojo1",
    title: "Spring Jam",
    date: "2026-05-01",
    ateliers: [
      { atelierId: "scratch", name: "Scratch" },
      { atelierId: "python", name: "Python", maxSeats: 2 },
    ],
    atelierCounts: { python: 2 }, // Python is full
  },
  questions: [] as unknown[],
};

function renderForm(fx: Fixtures = {}) {
  const f = { ...defaults, ...fx };
  apiMock.get.mockImplementation((url: string) => {
    if (url === "/events/evt1") return Promise.resolve({ data: f.event });
    if (url === "/users/me") return Promise.resolve({ data: f.profile });
    if (url === "/users/me/children") return Promise.resolve({ data: f.children });
    if (url.startsWith("/dojos/") && url.endsWith("/questions")) return Promise.resolve({ data: f.questions });
    return Promise.resolve({ data: {} });
  });
  apiMock.post.mockResolvedValue({ data: {} });

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/register/evt1"]}>
        <Routes>
          <Route path="/register/:eventId" element={<RegisterPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return userEvent.setup();
}

// Select a child by clicking its name, then pick an atelier from the dropdown.
async function selectChildAndAtelier(user: ReturnType<typeof userEvent.setup>, childName: string, atelier: string) {
  await user.click(await screen.findByText(childName));
  await user.click(screen.getByRole("combobox", { name: "registration.atelier" }));
  await user.click(await screen.findByRole("option", { name: atelier }));
}

beforeEach(() => {
  apiMock.get.mockReset();
  apiMock.post.mockReset();
});

describe("RegisterPage", () => {
  it("renders the event, the parent form prefilled, and the saved child", async () => {
    renderForm();
    expect(await screen.findByText(/Spring Jam/)).toBeTruthy();
    expect(await screen.findByText("Ada Lovelace")).toBeTruthy();
    // Parent name is prefilled from the profile.
    await waitFor(() => expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("John Doe"));
  });

  it("blocks submission when a child's name equals the parent's name", async () => {
    const user = renderForm({ children: [{ childId: "c1", name: "John Doe", birthdate: "2015-01-01" }] });
    await screen.findByDisplayValue("John Doe"); // wait for prefill
    await selectChildAndAtelier(user, "John Doe", "Scratch");
    await user.click(screen.getByRole("button", { name: "registration.submit" }));

    expect(await screen.findByText("registration.child_name_equals_parent")).toBeTruthy();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("disables a track that is full", async () => {
    const user = renderForm();
    await screen.findByDisplayValue("John Doe");
    await user.click(await screen.findByText("Ada Lovelace"));
    await user.click(screen.getByRole("combobox", { name: "registration.atelier" }));
    const python = await screen.findByRole("option", { name: /Python/ });
    expect(python.getAttribute("aria-disabled")).toBe("true");
    expect(python.textContent).toContain("events.full");
  });

  it("requires a custom question to be answered, then submits the answer", async () => {
    const user = renderForm({
      questions: [{ questionId: "q1", label: "Allergies", type: "text", required: true, active: true, order: 0 }],
    });
    await screen.findByDisplayValue("John Doe");
    await selectChildAndAtelier(user, "Ada Lovelace", "Scratch");

    // Required question is empty → blocked, no request.
    await user.click(screen.getByRole("button", { name: "registration.submit" }));
    expect(await screen.findByText("common.required")).toBeTruthy();
    expect(apiMock.post).not.toHaveBeenCalled();

    // Fill it → submits with the answer.
    await user.type(screen.getByLabelText("Allergies *"), "peanuts");
    await user.click(screen.getByRole("button", { name: "registration.submit" }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/events/evt1/registrations",
        expect.objectContaining({ childId: "c1", atelierId: "scratch", customAnswers: { q1: "peanuts" } })
      )
    );
  });

  it("submits a registration for the selected child and atelier", async () => {
    const user = renderForm();
    await screen.findByDisplayValue("John Doe");
    await selectChildAndAtelier(user, "Ada Lovelace", "Scratch");
    await user.click(screen.getByRole("button", { name: "registration.submit" }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/events/evt1/registrations",
        expect.objectContaining({ childId: "c1", atelierId: "scratch", parentName: "John Doe" })
      )
    );
  });
});
