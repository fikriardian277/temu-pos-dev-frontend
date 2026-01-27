import React from "react";

// Helper Format
const formatCurrency = (val) =>
  "Rp " + Number(val || 0).toLocaleString("id-ID");
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function PayrollSlipTemplate({
  slips,
  runData,
  settings,
  customHeader,
}) {
  if (!slips || slips.length === 0) return null;

  // --- LOGIC HEADER ---
  const companyName =
    customHeader?.name || settings?.business_name || "PT. MEGA KARYA HARAPAN";
  const companyAddress =
    customHeader?.address || settings?.address || "Jl. Terusan Sersan Bajuri";
  const companyPhone = customHeader?.phone_number || settings?.phone || "-";

  // --- WARNA TEMA ---
  const THEME_COLOR = "#1e40af";
  const THEME_LIGHT = "#eff6ff";
  const TEXT_COLOR = "#334155";

  // --- STYLE ---
  const styles = {
    wrapper: {
      backgroundColor: "white",
      fontFamily: "Helvetica, Arial, sans-serif",
      fontSize: "14px",
      color: TEXT_COLOR,
      lineHeight: "1.4",
      padding: "40px",
      maxWidth: "210mm",
      margin: "0 auto",
    },
    headerBorder: {
      borderBottom: `2px solid ${THEME_COLOR}`,
      paddingBottom: "15px",
      marginBottom: "25px",
    },
    title: {
      fontSize: "20px",
      fontWeight: "800",
      color: THEME_COLOR,
      margin: 0,
      textTransform: "uppercase",
    },
    pill: {
      backgroundColor: THEME_COLOR,
      color: "white",
      padding: "6px 15px",
      fontWeight: "bold",
      borderRadius: "4px",
      fontSize: "14px",
      display: "inline-block",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    },

    // Cards
    infoTable: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0",
    },
    card: {
      backgroundColor: "#f8fafc",
      border: "1px solid #e2e8f0",
      padding: "15px",
      borderRadius: "4px",
      verticalAlign: "top",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    },
    cardBlue: {
      backgroundColor: THEME_LIGHT,
      border: "1px solid #bfdbfe",
      padding: "15px",
      borderRadius: "4px",
      verticalAlign: "top",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    },
    cardHeader: {
      color: THEME_COLOR,
      fontWeight: "bold",
      fontSize: "11px",
      borderBottom: "1px solid #cbd5e1",
      display: "block",
      marginBottom: "5px",
      textTransform: "uppercase",
    },

    // Table
    dataTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "20px",
      fontSize: "13px",
    },
    th: {
      backgroundColor: THEME_COLOR,
      color: "white",
      padding: "10px",
      textAlign: "left",
      fontSize: "11px",
      fontWeight: "bold",
      textTransform: "uppercase",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    },
    td: {
      borderBottom: "1px solid #e2e8f0",
      padding: "8px 10px",
      color: TEXT_COLOR,
    },
    totalRow: {
      backgroundColor: "#f8fafc",
      fontWeight: "bold",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    },

    // Footer
    bankBox: {
      backgroundColor: "#f1f5f9",
      padding: "10px",
      borderRadius: "4px",
      border: "1px solid #e2e8f0",
      fontSize: "12px",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    },
    totalBox: {
      backgroundColor: THEME_COLOR,
      color: "white",
      padding: "15px",
      borderRadius: "4px",
      textAlign: "right",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    },

    // Disclaimer Text
    footerText: {
      fontSize: "11px",
      color: "#94a3b8",
      fontStyle: "italic",
      lineHeight: "1.4",
    },
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print { 
          @page { size: A4; margin: 0; } 
          body { -webkit-print-color-adjust: exact; }
          .page-break { page-break-after: always; }
        }
      `,
        }}
      />

      {slips.map((slip, index) => {
        const details = slip.details || [];
        const earnings = details.filter((d) => d.type !== "deduction");
        const deductions = details.filter((d) => d.type === "deduction");
        const totalEarnings = earnings.reduce(
          (sum, item) => sum + (Number(item.amount) || 0),
          0,
        );
        const totalDeductions = deductions.reduce(
          (sum, item) => sum + (Number(item.amount) || 0),
          0,
        );
        const joinDate = slip.join_date
          ? new Date(slip.join_date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "-";
        const take_home_pay = slip.take_home_pay || 0;

        return (
          <div key={index} style={styles.wrapper}>
            {/* Header */}
            <table width="100%" style={styles.headerBorder}>
              <tbody>
                <tr>
                  <td valign="top">
                    <h1 style={styles.title}>{companyName}</h1>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "5px",
                      }}
                    >
                      {companyAddress}
                      <br />
                      Phone: {companyPhone}
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <span style={styles.pill}>SLIP GAJI</span>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        marginTop: "8px",
                        color: "#475569",
                      }}
                    >
                      Periode: {formatDate(runData?.period_start)} -{" "}
                      {formatDate(runData?.period_end)}
                      <br />
                      ID: #{slip.id}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Info Cards */}
            <table style={styles.infoTable}>
              <tbody>
                <tr>
                  <td width="48%" style={styles.card}>
                    <span style={styles.cardHeader}>KARYAWAN</span>
                    <table width="100%" style={{ fontSize: "13px" }}>
                      <tbody>
                        <tr>
                          <td style={{ color: "#64748b", padding: "2px 0" }}>
                            Nama
                          </td>
                          <td style={{ fontWeight: "bold" }}>
                            : {slip.employee_name}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: "#64748b", padding: "2px 0" }}>
                            NIK
                          </td>
                          <td style={{ fontWeight: "bold" }}>
                            : {slip.nik || "-"}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: "#64748b", padding: "2px 0" }}>
                            Jabatan
                          </td>
                          <td style={{ fontWeight: "bold" }}>
                            : {slip.position || "-"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style={styles.cardBlue}>
                    <span style={styles.cardHeader}>PENEMPATAN</span>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                      {slip.branch_name || "Pusat"}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "5px",
                      }}
                    >
                      Join: {joinDate}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <br />

            {/* Earnings */}
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th style={styles.th} width="50">
                    NO
                  </th>
                  <th style={styles.th}>PENDAPATAN</th>
                  <th style={{ ...styles.th, textAlign: "right" }} width="150">
                    JUMLAH
                  </th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ ...styles.td, textAlign: "center" }}>
                      {idx + 1}
                    </td>
                    <td style={styles.td}>
                      <b>{item.name}</b>
                      {item.type === "variable" && (
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {item.qty} x{" "}
                          {Number(item.rate).toLocaleString("id-ID")}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        textAlign: "right",
                        fontFamily: "monospace",
                      }}
                    >
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
                <tr style={styles.totalRow}>
                  <td colSpan="2" style={{ ...styles.td, textAlign: "right" }}>
                    TOTAL PENDAPATAN
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      textAlign: "right",
                      fontFamily: "monospace",
                    }}
                  >
                    {formatCurrency(totalEarnings)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Deductions */}
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th style={styles.th} width="50">
                    NO
                  </th>
                  <th style={styles.th}>POTONGAN</th>
                  <th style={{ ...styles.th, textAlign: "right" }} width="150">
                    JUMLAH
                  </th>
                </tr>
              </thead>
              <tbody>
                {deductions.length > 0 ? (
                  deductions.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        {idx + 1}
                      </td>
                      <td style={styles.td}>
                        <b>{item.name}</b>
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          textAlign: "right",
                          color: "#dc2626",
                          fontFamily: "monospace",
                        }}
                      >
                        ({formatCurrency(item.amount)})
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      style={{
                        ...styles.td,
                        textAlign: "center",
                        color: "#94a3b8",
                        fontStyle: "italic",
                      }}
                    >
                      Tidak ada potongan
                    </td>
                  </tr>
                )}
                <tr style={styles.totalRow}>
                  <td colSpan="2" style={{ ...styles.td, textAlign: "right" }}>
                    TOTAL POTONGAN
                  </td>
                  <td
                    style={{
                      ...styles.td,
                      textAlign: "right",
                      color: "#dc2626",
                      fontFamily: "monospace",
                    }}
                  >
                    ({formatCurrency(totalDeductions)})
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer Summary */}
            <table width="100%" style={{ marginTop: "10px" }}>
              <tbody>
                <tr>
                  <td width="55%" valign="top" style={{ paddingRight: "10px" }}>
                    <div style={styles.bankBox}>
                      <div
                        style={{
                          fontWeight: "bold",
                          fontSize: "11px",
                          color: "#64748b",
                          marginBottom: "5px",
                        }}
                      >
                        INSTRUKSI TRANSFER
                      </div>
                      <div>
                        Bank: <b>{slip.bank_name || "..."}</b>
                      </div>
                      <div>
                        Rek: <b>{slip.account_number || "-"}</b>
                      </div>
                    </div>
                  </td>
                  <td width="45%" valign="top">
                    <div style={styles.totalBox}>
                      <div
                        style={{
                          fontSize: "12px",
                          opacity: 0.9,
                          marginBottom: "5px",
                        }}
                      >
                        TAKE HOME PAY
                      </div>
                      <div
                        style={{
                          fontSize: "20px",
                          fontWeight: "bold",
                          fontFamily: "monospace",
                        }}
                      >
                        {formatCurrency(take_home_pay)}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* DISCLAIMER - SUDAH DITAMBAHKAN */}
            <div
              style={{
                marginTop: "40px",
                paddingTop: "15px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div style={styles.footerText}>
                <p style={{ margin: 0 }}>
                  This document is computer generated and valid without
                  signature.
                </p>
                <p style={{ margin: "2px 0 0 0", fontWeight: "bold" }}>
                  {companyName} - HRIS System
                </p>
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                Confidential | {new Date().toLocaleDateString("id-ID")}
              </div>
            </div>

            <div className="page-break"></div>
          </div>
        );
      })}
    </>
  );
}
