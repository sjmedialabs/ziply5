import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type OrderForInvoice = {
  id: string
  status: string
  currency: string
  subtotal?: string | number
  tax?: string | number
  discount?: string | number
  shipping?: string | number
  total: string | number
  createdAt: string
  customerName?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  user?: { email?: string | null } | null
  items: Array<{
    id: string
    quantity: number
    unitPrice?: string | number
    lineTotal?: string | number
    product?: { name?: string | null } | null
  }>
}

export const generateInvoicePDF = async (order: OrderForInvoice) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // --- Helper: Get Logo ---
  const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.setAttribute("crossOrigin", "anonymous")
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(img, 0, 0)
        const dataURL = canvas.toDataURL("image/png")
        resolve(dataURL)
      }
      img.onerror = (error) => reject(error)
      img.src = url
    })
  }

  try {
    // --- Add Logo ---
    try {
      const logoData = await getBase64ImageFromURL("/primaryLogo.png")
      doc.addImage(logoData, "PNG", 15, 10, 40, 15)
    } catch (err) {
      console.warn("Could not load logo", err)
      doc.setFontSize(22)
      doc.setTextColor(74, 29, 31) // #4A1D1F
      doc.text("ZIPLY5", 15, 20)
    }

    // --- Header Info ---
    doc.setFontSize(24)
    doc.setTextColor(74, 29, 31)
    doc.text("INVOICE", pageWidth - 15, 20, { align: "right" })

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    const createdOn = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    doc.text(`Order ID: ${order.id}`, pageWidth - 15, 28, { align: "right" })
    doc.text(`Date: ${createdOn}`, pageWidth - 15, 33, { align: "right" })
    doc.text(`Status: ${order.status.toUpperCase()}`, pageWidth - 15, 38, { align: "right" })

    // --- Divider ---
    doc.setDrawColor(232, 220, 200) // #E8DCC8
    doc.line(15, 45, pageWidth - 15, 45)

    // --- Customer Details ---
    doc.setFontSize(12)
    doc.setTextColor(74, 29, 31)
    doc.text("BILL TO:", 15, 55)

    doc.setFontSize(10)
    doc.setTextColor(42, 24, 16) // #2A1810
    doc.text(order.customerName ?? "-", 15, 62)
    doc.text(order.customerPhone ?? "-", 15, 67)
    doc.text(order.user?.email ?? "-", 15, 72)

    const addressLines = doc.splitTextToSize(order.customerAddress ?? "-", 80)
    doc.text(addressLines, 15, 77)

    // --- Items Table ---
    // Dynamically calculate table start based on address height
    const addressHeight = addressLines.length * 5
    const tableStartY = Math.max(95, 77 + addressHeight + 10)

    const tableData = order.items.map((item) => [
      item.product?.name ?? "Product",
      item.quantity.toString(),
      `${order.currency} ${Number(item.unitPrice ?? 0).toFixed(2)}`,
      `${order.currency} ${Number(item.lineTotal ?? Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0)).toFixed(2)}`
    ])

    autoTable(doc, {
      startY: tableStartY,
      head: [["Product Details", "Qty", "Unit Price", "Subtotal"]],
      body: tableData,
      headStyles: {
        fillColor: [123, 48, 16],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: "bold",
      },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "left", cellWidth: 25 },
        2: { halign: "left", cellWidth: 35 },
        3: { halign: "left", cellWidth: 35 },
      },
      alternateRowStyles: { fillColor: [253, 240, 230] }, // #FDF0E6
      margin: { left: 15, right: 15 },
    })

    // --- Summary ---
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const summaryX = pageWidth - 65 // Adjusted for better label alignment
    const valueX = pageWidth - 15 - 4 // Match table's internal padding (cellPadding: 4)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text("Subtotal:", summaryX, finalY)
    doc.text("Tax:", summaryX, finalY + 7)
    doc.text("Discount:", summaryX, finalY + 14)
    doc.text("Shipping:", summaryX, finalY + 21)

    // --- Line above Total ---
    doc.setDrawColor(232, 220, 200) // #E8DCC8
    doc.setLineWidth(0.5)
    doc.line(summaryX, finalY + 25, pageWidth - 15, finalY + 25)

    doc.setFontSize(11)
    doc.setTextColor(74, 29, 31)
    doc.text("Total:", summaryX, finalY + 31)

    doc.setFontSize(10)
    doc.setTextColor(42, 24, 16)
    doc.text(`${order.currency} ${Number(order.subtotal ?? 0).toFixed(2)}`, valueX, finalY, { align: "right" })
    doc.text(`${order.currency} ${Number(order.tax ?? 0).toFixed(2)}`, valueX, finalY + 7, { align: "right" })
    doc.text(`- ${order.currency} ${Number(order.discount ?? 0).toFixed(2)}`, valueX, finalY + 14, { align: "right" })
    doc.text(`${order.currency} ${Number(order.shipping ?? 0).toFixed(2)}`, valueX, finalY + 21, { align: "right" })

    doc.setFontSize(11)
    doc.setTextColor(123, 48, 16)
    doc.setFont("helvetica", "bold")
    doc.text(`${order.currency} ${Number(order.total).toFixed(2)}`, valueX, finalY + 31, { align: "right" })

    // --- Footer ---
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(150, 150, 150)
    doc.text("Thank you for shopping with Ziply5!", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" })

    doc.save(`invoice-${order.id}.pdf`)
    return true
  } catch (error) {
    console.error("PDF generation error", error)
    return false
  }
}
