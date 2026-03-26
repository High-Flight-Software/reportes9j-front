// src/components/ConversationList.tsx
import React, { useEffect, useState } from 'react';
import {
  getFilteredConversations,
  downloadConversationsReport,
  reportAndSendOpportunitiesByDate,
} from '../services/conversationService';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ConversationList.css';

const socket = io('http://localhost:3002');

interface Message {
  sender: string;
  content: string;
  type: string;
  createdAt: string;
}

interface Conversation {
  _id: string;
  state: string;
  result: string;
  startedAt: string;
  messages: Message[];
  companyId: number;
  origin: string;
}

const ConversationList: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [total, setTotal] = useState(0);

  // Filtro opcional para la lista (por día)
  const [filterDate, setFilterDate] = useState<string>('');

  // Reporte por rango (ZIP) o por fecha (XLSX)
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportFrom, setReportFrom] = useState<string>('');
  const [reportTo, setReportTo] = useState<string>('');

  // Oportunidades (por día)
  const [processingOpps, setProcessingOpps] = useState(false);
  const [oppsDate, setOppsDate] = useState<string>('');

  useEffect(() => {
    fetchConversations();

    socket.on('newConversation', (newConversation: Conversation) => {
      toast.info('📢 Nueva conversación recibida');
      setConversations((prev) => [newConversation, ...prev]);
      setTotal((prev) => prev + 1);
    });

    return () => {
      socket.off('newConversation');
    };
    // eslint-disable-next-line
  }, [page, filterDate]);

  const fetchConversations = async () => {
    const data = await getFilteredConversations(page, limit, filterDate || undefined);
    setConversations(data.conversations || []);
    setTotal(data.total || 0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleDownloadReport = async () => {
    // Caso rango (ZIP): requiere desde y hasta
    if (!reportFrom || !reportTo) {
      toast.warn('⚠️ Seleccioná "Desde" y "Hasta" para descargar el ZIP por rango.');
      return;
    }
    if (new Date(reportFrom) > new Date(reportTo)) {
      toast.error('❌ La fecha "Desde" no puede ser mayor a "Hasta".');
      return;
    }

    try {
      setLoadingReport(true);
      // RANGO => ZIP
      await downloadConversationsReport(undefined, reportFrom, reportTo);
      toast.success('✅ ZIP de reportes descargado');
    } catch (err: any) {
      toast.error(`❌ Error al descargar reporte: ${err?.message || 'desconocido'}`);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadSingleDayReport = async () => {
    if (!oppsDate) {
      toast.warn('⚠️ Seleccioná una fecha para descargar el XLSX de ese día.');
      return;
    }

    try {
      setLoadingReport(true);
      // FECHA => XLSX
      await downloadConversationsReport(oppsDate);
      toast.success('✅ Reporte del día descargado');
    } catch (err: any) {
      toast.error(`❌ Error al descargar reporte del día: ${err?.message || 'desconocido'}`);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleProcessOpportunities = async () => {
    if (!oppsDate) {
      toast.warn('⚠️ Seleccioná una fecha');
      return;
    }
    try {
      setProcessingOpps(true);
      toast.info('Procesando oportunidades, esto puede demorar unos segundos...');
      const resp = await reportAndSendOpportunitiesByDate(oppsDate);
      if (resp.success) {
        toast.success(`✅ ${resp.result?.length || 0} oportunidades procesadas`);
      } else {
        toast.error(`❌ Error: ${resp.error || 'No se pudo procesar'}`);
      }
    } catch (err: any) {
      toast.error(`❌ Error inesperado: ${err?.message || 'desconocido'}`);
    } finally {
      setProcessingOpps(false);
    }
  };

  return (
    <div className="conversation-container">
      <h2>Conversaciones Filtradas</h2>

      {/* Panel acciones */}
      <div
        className="actions-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          border: '1px solid #ddd',
        }}
      >
        {/* Filtro lista */}
        <div
          className="action-group"
          style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}
        >
          <strong>🔎 Filtro lista:</strong>
          <label>
            Fecha:
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setPage(1);
                setFilterDate(e.target.value);
              }}
              className="date-input"
              style={{ marginLeft: '5px' }}
              disabled={loadingReport || processingOpps}
            />
          </label>

          <button
            onClick={() => {
              setPage(1);
              setFilterDate('');
            }}
            disabled={!filterDate || loadingReport || processingOpps}
            className="process-btn"
            style={{ backgroundColor: '#6c757d', color: 'white' }}
          >
            Limpiar filtro
          </button>
        </div>

        <hr style={{ width: '100%', borderColor: '#ddd', margin: '0' }} />

        {/* Reporte por rango (ZIP) */}
        <div
          className="action-group"
          style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}
        >
          <strong>📦 Reportes por rango (ZIP):</strong>

          <label>
            Desde:
            <input
              type="date"
              value={reportFrom}
              onChange={(e) => setReportFrom(e.target.value)}
              className="date-input"
              style={{ marginLeft: '5px' }}
              disabled={loadingReport || processingOpps}
            />
          </label>

          <label>
            Hasta:
            <input
              type="date"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              className="date-input"
              style={{ marginLeft: '5px' }}
              disabled={loadingReport || processingOpps}
            />
          </label>

          <button
            onClick={handleDownloadReport}
            disabled={loadingReport || processingOpps || !reportFrom || !reportTo}
            className="download-btn"
            style={{ backgroundColor: '#2E75B6', color: 'white' }}
          >
            {loadingReport ? 'Generando...' : '📥 Descargar ZIP'}
          </button>
        </div>

        <hr style={{ width: '100%', borderColor: '#ddd', margin: '0' }} />

        {/* Acciones por día (XLSX + Oportunidades) */}
        <div
          className="action-group"
          style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}
        >
          <strong>📅 Acciones por día:</strong>

          <input
            type="date"
            value={oppsDate}
            onChange={(e) => setOppsDate(e.target.value)}
            disabled={processingOpps || loadingReport}
            className="date-input"
          />

          <button
            onClick={handleDownloadSingleDayReport}
            disabled={loadingReport || !oppsDate}
            className="download-btn"
            style={{ backgroundColor: '#0d6efd', color: 'white' }}
          >
            {loadingReport ? 'Generando...' : '📥 Descargar XLSX (día)'}
          </button>

          <button
            onClick={handleProcessOpportunities}
            disabled={processingOpps || !oppsDate}
            className="process-btn"
            style={{ backgroundColor: '#28a745', color: 'white' }}
          >
            {processingOpps ? 'Procesando…' : '🚀 Procesar oportunidades'}
          </button>
        </div>
      </div>

      <p className="total-conversations">Total de conversaciones: {total}</p>

      {conversations.length === 0 ? (
        <p>No hay conversaciones disponibles.</p>
      ) : (
        <div className="conversation-list">
          {conversations.map((conv) => (
            <div className="conversation-card" key={conv._id}>
              <h3>
                Estado: {conv.state} | Resultado: {conv.result}
              </h3>
              <p className="date">📅 {new Date(conv.startedAt).toLocaleString()}</p>
              <div className="messages">
                {conv.messages.map((msg: Message, index: number) => (
                  <div key={index} className={`message ${msg.sender}`}>
                    <strong>{msg.sender === 'user' ? '🧑 Usuario' : '🤖 Asistente'}:</strong>{' '}
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
          ⬅️ Anterior
        </button>
        <span>Página {page}</span>
        <button disabled={page * limit >= total} onClick={() => handlePageChange(page + 1)}>
          Siguiente ➡️
        </button>
      </div>
    </div>
  );
};

export default ConversationList;
