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

const SOCKET_URL = 
  (import.meta as any).env?.VITE_SOCKET_URL || 
  process.env.REACT_APP_SOCKET_URL || 
  'https://reportes9j.hichat.com.ar';

const SECURITY_PASS = 
  (import.meta as any).env?.VITE_SECURITYPASS || 
  process.env.REACT_APP_SECURITYPASS || 
  's9Jreportes2026';

let socket: any;

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
  // --- ESTADO DE AUTENTICACIÓN ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // --- ESTADOS DE DATOS ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [total, setTotal] = useState(0);

  const [filterDate, setFilterDate] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportFrom, setReportFrom] = useState<string>('');
  const [reportTo, setReportTo] = useState<string>('');
  const [processingOpps, setProcessingOpps] = useState(false);
  const [oppsDate, setOppsDate] = useState<string>('');

  // Iniciar conexión y traer datos SOLO si está autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    if (!socket) {
      socket = io(SOCKET_URL);
    }

    fetchConversations();

    socket.on('newConversation', (newConversation: Conversation) => {
      toast.info('📢 Nueva conversación recibida');
      setConversations((prev) => [newConversation, ...prev]);
      setTotal((prev) => prev + 1);
    });

    return () => {
      if (socket) socket.off('newConversation');
    };
    // eslint-disable-next-line
  }, [page, filterDate, isAuthenticated]);

  const fetchConversations = async () => {
    const data = await getFilteredConversations(page, limit, filterDate || undefined);
    setConversations(data.conversations || []);
    setTotal(data.total || 0);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === SECURITY_PASS) {
      setIsAuthenticated(true);
      toast.success('¡Acceso concedido!');
    } else {
      toast.error('Contraseña incorrecta ❌');
      setPasswordInput('');
    }
  };

  const handleDownloadReport = async () => {
    if (!reportFrom || !reportTo) {
      toast.warn('⚠️ Seleccioná "Desde" y "Hasta" para el ZIP.');
      return;
    }
    if (new Date(reportFrom) > new Date(reportTo)) {
      toast.error('❌ La fecha "Desde" no puede ser mayor a "Hasta".');
      return;
    }

    try {
      setLoadingReport(true);
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
      toast.warn('⚠️ Seleccioná una fecha para el XLSX.');
      return;
    }
    try {
      setLoadingReport(true);
      await downloadConversationsReport(oppsDate);
      toast.success('✅ Reporte del día descargado');
    } catch (err: any) {
      toast.error(`❌ Error: ${err?.message || 'desconocido'}`);
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
      toast.info('Procesando oportunidades, por favor esperá...');
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

  // --- PANTALLA DE LOGIN ---
  if (!isAuthenticated) {
    return (
      <div style={styles.loginWrapper}>
        <form onSubmit={handleLogin} style={styles.loginCard}>
          <h2 style={{ marginBottom: '10px', color: '#333' }}>🔒 Acceso Restringido</h2>
          <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
            Ingresá la clave de seguridad para ver los reportes S9J.
          </p>
          <input
            type="password"
            placeholder="Contraseña de seguridad..."
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={styles.loginInput}
            autoFocus
          />
          <button type="submit" style={styles.loginButton}>Ingresar 🚀</button>
        </form>
      </div>
    );
  }

  // --- PANTALLA PRINCIPAL (DASHBOARD) ---
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>📊 Panel de Reportes S9J</h2>
        <span style={styles.badge}>Total registros: {total}</span>
      </div>

      <div style={styles.dashboardGrid}>
        
        {/* Tarjeta de Filtros de Lista */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🔎 Buscar Conversaciones</h3>
          <div style={styles.inputGroup}>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setPage(1);
                setFilterDate(e.target.value);
              }}
              style={styles.input}
              disabled={loadingReport || processingOpps}
            />
            <button
              onClick={() => {
                setPage(1);
                setFilterDate('');
              }}
              disabled={!filterDate || loadingReport || processingOpps}
              style={{ ...styles.btn, ...styles.btnSecondary }}
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Tarjeta de Descarga Masiva (ZIP) */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📦 Exportar Rango (ZIP)</h3>
          <div style={styles.inputGroup}>
            <input
              type="date"
              value={reportFrom}
              onChange={(e) => setReportFrom(e.target.value)}
              style={styles.input}
              disabled={loadingReport || processingOpps}
            />
            <span style={{color: '#666'}}>hasta</span>
            <input
              type="date"
              value={reportTo}
              onChange={(e) => setReportTo(e.target.value)}
              style={styles.input}
              disabled={loadingReport || processingOpps}
            />
          </div>
          <button
            onClick={handleDownloadReport}
            disabled={loadingReport || processingOpps || !reportFrom || !reportTo}
            style={{ ...styles.btn, ...styles.btnPrimary, width: '100%', marginTop: '10px' }}
          >
            {loadingReport ? 'Generando...' : '📥 Descargar ZIP'}
          </button>
        </div>

        {/* Tarjeta de Acciones Diarias */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📅 Acciones por Día (XLSX)</h3>
          <div style={styles.inputGroup}>
            <input
              type="date"
              value={oppsDate}
              onChange={(e) => setOppsDate(e.target.value)}
              disabled={processingOpps || loadingReport}
              style={{...styles.input, width: '100%'}}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              onClick={handleDownloadSingleDayReport}
              disabled={loadingReport || !oppsDate}
              style={{ ...styles.btn, ...styles.btnPrimary, flex: 1 }}
            >
              {loadingReport ? '⌛' : '📥 XLSX'}
            </button>
            <button
              onClick={handleProcessOpportunities}
              disabled={processingOpps || !oppsDate}
              style={{ ...styles.btn, ...styles.btnSuccess, flex: 1 }}
            >
              {processingOpps ? '⌛' : '🚀 Procesar'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Conversaciones */}
      <div style={styles.chatContainer}>
        {conversations.length === 0 ? (
          <div style={styles.emptyState}>No hay conversaciones para los filtros seleccionados.</div>
        ) : (
          <div style={styles.list}>
            {conversations.map((conv) => (
              <div key={conv._id} style={styles.chatCard}>
                <div style={styles.chatHeader}>
                  <span style={styles.statusBadge}>Estado: {conv.state}</span>
                  <span style={{ fontSize: '13px', color: '#666' }}>
                    📅 {new Date(conv.startedAt).toLocaleString()}
                  </span>
                </div>
                <div style={styles.messagesBox}>
                  {conv.messages.map((msg: Message, index: number) => (
                    <div key={index} style={{
                      ...styles.messageBubble,
                      alignSelf: msg.sender === 'user' ? 'flex-start' : 'flex-end',
                      backgroundColor: msg.sender === 'user' ? '#e9ecef' : '#d1e7dd',
                      borderBottomLeftRadius: msg.sender === 'user' ? '0' : '10px',
                      borderBottomRightRadius: msg.sender === 'user' ? '10px' : '0',
                    }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#555' }}>
                        {msg.sender === 'user' ? '🧑 Cliente' : '🤖 Bot'}
                      </div>
                      <div>{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginación */}
      <div style={styles.pagination}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={styles.pageBtn}>
          ⬅️ Anterior
        </button>
        <span style={{ fontWeight: 'bold', color: '#444' }}>Página {page}</span>
        <button disabled={page * limit >= total} onClick={() => setPage(page + 1)} style={styles.pageBtn}>
          Siguiente ➡️
        </button>
      </div>
    </div>
  );
};

// --- ESTILOS EN LÍNEA (Para mejorar el diseño sin tocar CSS externo) ---
const styles: { [key: string]: React.CSSProperties } = {
  loginWrapper: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' },
  loginCard: { backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%' },
  loginInput: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', marginBottom: '20px', boxSizing: 'border-box' },
  loginButton: { width: '100%', padding: '12px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #eee' },
  badge: { backgroundColor: '#e9ecef', padding: '5px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', color: '#495057' },
  
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' },
  card: { backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eaeaea' },
  cardTitle: { margin: '0 0 15px 0', fontSize: '16px', color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  inputGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  input: { padding: '8px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', flex: 1 },
  
  btn: { padding: '10px 15px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'opacity 0.2s' },
  btnPrimary: { backgroundColor: '#0d6efd', color: 'white' },
  btnSuccess: { backgroundColor: '#198754', color: 'white' },
  btnSecondary: { backgroundColor: '#6c757d', color: 'white' },

  chatContainer: { backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px', minHeight: '300px' },
  emptyState: { textAlign: 'center', color: '#6c757d', marginTop: '50px', fontStyle: 'italic' },
  list: { display: 'flex', flexDirection: 'column', gap: '20px' },
  
  chatCard: { backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #e0e0e0' },
  chatHeader: { backgroundColor: '#f1f3f5', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e0e0e0' },
  statusBadge: { backgroundColor: '#0d6efd', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  
  messagesBox: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' },
  messageBubble: { padding: '10px 15px', borderRadius: '10px', maxWidth: '80%', fontSize: '14px', lineHeight: '1.4' },
  
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '30px' },
  pageBtn: { padding: '8px 16px', borderRadius: '20px', border: '1px solid #dee2e6', backgroundColor: 'white', cursor: 'pointer', fontWeight: 'bold' }
};

export default ConversationList;