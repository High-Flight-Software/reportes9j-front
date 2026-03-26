// src/services/conversationService.ts
import axios from 'axios';

const API_URL = process.env.API_URL;

/**
 * Trae las conversaciones paginadas y filtradas.
 * (Opcional) fecha: YYYY-MM-DD para filtrar por día
 */
export const getFilteredConversations = async (
  page = 1,
  limit = 10,
  fecha?: string,
) => {
  try {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (fecha) params.append('fecha', fecha);

    const response = await axios.get(`${API_URL}?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return { conversations: [], total: 0 };
  }
};

/**
 * Descarga el reporte:
 * - Si pasás fecha => baja 1 XLSX
 * - Si pasás desde+hasta => baja 1 ZIP con 1 XLSX por día
 *
 * @param fecha YYYY-MM-DD (opcional)
 * @param desde YYYY-MM-DD (opcional)
 * @param hasta YYYY-MM-DD (opcional)
 */
export const downloadConversationsReport = async (
  fecha?: string,
  desde?: string,
  hasta?: string,
) => {
  try {
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (desde) params.append('desde', desde);
    if (hasta) params.append('hasta', hasta);

    const reportUrl = `${API_URL}/report${params.toString() ? `?${params.toString()}` : ''}`;

    console.log(`Downloading report from: ${reportUrl}`);

    const response = await axios.get(reportUrl, {
      responseType: 'blob',
    });

    // Si viene rango (desde+hasta) => zip
    const isRange = Boolean(desde && hasta);

    const fileName = isRange
      ? `reportes_s9j_${desde}_al_${hasta}.zip`
      : fecha
        ? `reporte_s9j_${fecha}.xlsx`
        : 'reporte_s9j.xlsx';

    const blob = new Blob([response.data], {
      type: isRange
        ? 'application/zip'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
};

/**
 * Llama al endpoint que analiza y envía oportunidades por fecha.
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<{success: boolean, result: any[]}|{success: false, error: string}>}
 */
export const reportAndSendOpportunitiesByDate = async (fecha: string) => {
  try {
    const response = await axios.post(`${API_URL}/report-opportunities`, { fecha });
    return response.data;
  } catch (error: any) {
    console.error('Error reporting and sending opportunities:', error);
    if (error.response && error.response.data) return error.response.data;
    return { success: false, error: 'Error inesperado en el frontend' };
  }
};
