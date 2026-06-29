"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Studio } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentStudio } from "@/lib/studio";
import { parsePriceToCents } from "@/lib/money";

async function requireStudio(): Promise<Studio> {
  const studio = await getCurrentStudio();
  if (!studio) redirect("/admin/login");
  return studio;
}

const LineSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().min(0),
  vatRate: z.number().min(0).max(100),
});

export type InvoiceFormState = { error: string } | undefined;

// Create an invoice with its line items. Allocates the next per-studio invoice
// number in a transaction so two invoices can't grab the same number.
export async function createInvoice(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const studio = await requireStudio();

  const customerName = String(formData.get("customerName") ?? "").trim();
  if (!customerName) return { error: "Customer name is required." };

  const issueDateStr = String(formData.get("issueDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issueDateStr)) {
    return { error: "A valid issue date is required." };
  }
  const dueDateStr = String(formData.get("dueDate") ?? "");
  const status = String(formData.get("status") ?? "DRAFT");

  // Parallel arrays from the repeatable line-item rows.
  const descriptions = formData.getAll("description").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitPrices = formData.getAll("unitPrice").map(String);
  const vatRates = formData.getAll("vatRate").map(String);

  const items: z.infer<typeof LineSchema>[] = [];
  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i]?.trim();
    if (!description) continue; // skip blank rows
    const quantity = Number(quantities[i] || "1");
    const unitPriceCents = parsePriceToCents(unitPrices[i] || "");
    const vatRate = Number(vatRates[i] || "0");
    const parsed = LineSchema.safeParse({
      description,
      quantity,
      unitPriceCents: unitPriceCents ?? NaN,
      vatRate,
    });
    if (!parsed.success) {
      return { error: `Check line ${i + 1}: needs a description, quantity and price.` };
    }
    items.push(parsed.data);
  }

  if (items.length === 0) {
    return { error: "Add at least one line item." };
  }
  if (!["DRAFT", "SENT", "PAID"].includes(status)) {
    return { error: "Invalid status." };
  }

  const issueDate = new Date(`${issueDateStr}T00:00:00Z`);
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)
    ? new Date(`${dueDateStr}T00:00:00Z`)
    : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const invoice = await prisma.$transaction(async (tx) => {
    const last = await tx.invoice.findFirst({
      where: { studioId: studio.id },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 0) + 1;
    return tx.invoice.create({
      data: {
        studioId: studio.id,
        number,
        customerName,
        customerEmail: String(formData.get("customerEmail") ?? "").trim() || null,
        customerAddress:
          String(formData.get("customerAddress") ?? "").trim() || null,
        issueDate,
        dueDate,
        status: status as "DRAFT" | "SENT" | "PAID",
        notes,
        currency: studio.currency,
        lineItems: {
          create: items.map((it, idx) => ({
            description: it.description,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
            vatRate: it.vatRate,
            position: idx,
          })),
        },
      },
    });
  });

  revalidatePath("/admin/accounting/invoices");
  redirect(`/admin/accounting/invoices/${invoice.id}`);
}

export async function setInvoiceStatus(formData: FormData): Promise<void> {
  const studio = await requireStudio();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["DRAFT", "SENT", "PAID"].includes(status)) return;
  await prisma.invoice.updateMany({
    where: { id, studioId: studio.id },
    data: { status: status as "DRAFT" | "SENT" | "PAID" },
  });
  revalidatePath("/admin/accounting/invoices");
  revalidatePath(`/admin/accounting/invoices/${id}`);
}

export async function deleteInvoice(formData: FormData): Promise<void> {
  const studio = await requireStudio();
  const id = String(formData.get("id") ?? "");
  await prisma.invoice.deleteMany({ where: { id, studioId: studio.id } });
  revalidatePath("/admin/accounting/invoices");
  redirect("/admin/accounting/invoices");
}
