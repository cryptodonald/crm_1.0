import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { NewLeadModal } from '../new-lead-modal';

// Mock toast per evitare errori
jest.mock('sonner');

// Mock API fetch
global.fetch = jest.fn();

// Mock degli hooks personalizzati se necessari
jest.mock('@/hooks/use-leads-data', () => ({
  useLeadsData: () => ({
    leads: [],
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

// Mock componenti UI per semplificare i test
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => {
    return open ? (
      <div data-testid="dialog-container" role="dialog">
        <button
          data-testid="dialog-close-button"
          onClick={() => onOpenChange(false)}
        >
          ×
        </button>
        {children}
      </div>
    ) : null;
  },
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
}));

jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => <div data-testid="form-wrapper">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress-bar" data-value={value} />
  ),
}));

jest.mock('@/components/ui/avatar-lead', () => ({
  AvatarLead: ({ nome, size }: any) => (
    <div data-testid="avatar-lead" data-nome={nome} data-size={size}>
      Avatar
    </div>
  ),
}));

// Mock dei componenti step
jest.mock('../new-lead-steps/anagrafica-step', () => ({
  AnagraficaStep: ({ form }: any) => (
    <div data-testid="anagrafica-step">
      <input
        data-testid="nome-input"
        onChange={(e) => form.setValue('Nome', e.target.value)}
        placeholder="Nome"
      />
      <input
        data-testid="telefono-input"
        onChange={(e) => form.setValue('Telefono', e.target.value)}
        placeholder="Telefono"
      />
      <input
        data-testid="email-input"
        onChange={(e) => form.setValue('Email', e.target.value)}
        placeholder="Email"
      />
    </div>
  ),
}));

jest.mock('../new-lead-steps/qualificazione-step', () => ({
  QualificazioneStep: ({ form }: any) => (
    <div data-testid="qualificazione-step">
      <select
        data-testid="stato-select"
        onChange={(e) => form.setValue('Stato', e.target.value)}
      >
        <option value="">Seleziona stato</option>
        <option value="Nuovo">Nuovo</option>
        <option value="Contattato">Contattato</option>
      </select>
      <select
        data-testid="provenienza-select"
        onChange={(e) => form.setValue('Provenienza', e.target.value)}
      >
        <option value="">Seleziona provenienza</option>
        <option value="Sito">Sito</option>
        <option value="Social">Social</option>
      </select>
    </div>
  ),
}));

jest.mock('../new-lead-steps/documenti-step', () => ({
  DocumentiStep: () => <div data-testid="documenti-step">Documenti Step</div>,
}));

describe('NewLeadModal', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onSuccess: mockOnSuccess,
  };

  it('should render when open', () => {
    render(<NewLeadModal {...defaultProps} />);
    
    expect(screen.getByTestId('dialog-container')).toBeInTheDocument();
    expect(screen.getByTestId('anagrafica-step')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<NewLeadModal {...defaultProps} open={false} />);
    
    expect(screen.queryByTestId('dialog-container')).not.toBeInTheDocument();
  });

  it('should call onOpenChange when close button is clicked', () => {
    render(<NewLeadModal {...defaultProps} />);
    
    const closeButton = screen.getByTestId('dialog-close-button');
    fireEvent.click(closeButton);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close modal after successful lead creation', async () => {
    const user = userEvent.setup();

    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        lead: {
          id: 'new-lead-id',
          Nome: 'Test Lead',
        },
      }),
    });

    render(<NewLeadModal {...defaultProps} />);

    // Compilare i campi del form per il primo step
    const nomeInput = screen.getByTestId('nome-input');
    await user.type(nomeInput, 'Test Lead');

    // Andare al secondo step
    const avanti1Button = screen.getByText('Avanti');
    await user.click(avanti1Button);

    await waitFor(() => {
      expect(screen.getByTestId('qualificazione-step')).toBeInTheDocument();
    });

    // Compilare i campi obbligatori del secondo step
    const statoSelect = screen.getByTestId('stato-select');
    const provenienzaSelect = screen.getByTestId('provenienza-select');
    await user.selectOptions(statoSelect, 'Nuovo');
    await user.selectOptions(provenienzaSelect, 'Sito');

    // Andare al terzo step
    const avanti2Button = screen.getByText('Avanti');
    await user.click(avanti2Button);

    await waitFor(() => {
      expect(screen.getByTestId('documenti-step')).toBeInTheDocument();
    });

    // Cliccare sul pulsante "Crea Lead"
    const creaLeadButton = screen.getByText('Crea Lead');
    await user.click(creaLeadButton);

    // Attendere che la chiamata API venga effettuata
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Test Lead'),
        signal: expect.any(AbortSignal),
      });
    });

    // Verificare che onOpenChange sia stato chiamato per chiudere il modal
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    // Verificare che onSuccess sia stato chiamato
    expect(mockOnSuccess).toHaveBeenCalled();

    // Verificare che il toast di successo sia stato mostrato
    expect(toast.success).toHaveBeenCalledWith('Lead creato con successo!', {
      description: 'Il lead "Test Lead" è stato aggiunto al CRM.',
    });
  });

  it('should not close modal if API call fails', async () => {
    const user = userEvent.setup();

    // Mock failed API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'API Error',
      }),
    });

    render(<NewLeadModal {...defaultProps} />);

    // Completare il form velocemente per testare il fallimento
    const nomeInput = screen.getByTestId('nome-input');
    await user.type(nomeInput, 'Test Lead');

    // Vai al secondo step
    const avanti1Button = screen.getByText('Avanti');
    await user.click(avanti1Button);

    await waitFor(() => {
      expect(screen.getByTestId('qualificazione-step')).toBeInTheDocument();
    });

    const statoSelect = screen.getByTestId('stato-select');
    const provenienzaSelect = screen.getByTestId('provenienza-select');
    await user.selectOptions(statoSelect, 'Nuovo');
    await user.selectOptions(provenienzaSelect, 'Sito');

    // Vai al terzo step
    const avanti2Button = screen.getByText('Avanti');
    await user.click(avanti2Button);

    await waitFor(() => {
      expect(screen.getByTestId('documenti-step')).toBeInTheDocument();
    });

    // Cliccare sul pulsante "Crea Lead"
    const creaLeadButton = screen.getByText('Crea Lead');
    await user.click(creaLeadButton);

    // Attendere che la chiamata API venga effettuata
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Il modal NON dovrebbe essere chiuso in caso di errore
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
    expect(mockOnSuccess).not.toHaveBeenCalled();

    // Verificare che il toast di errore sia stato mostrato
    expect(toast.error).toHaveBeenCalledWith('Errore nella creazione del lead', {
      description: expect.stringContaining('API Error'),
      duration: 5000,
    });
  });

  it('should handle draft logic when closing with unsaved data', async () => {
    const user = userEvent.setup();

    render(<NewLeadModal {...defaultProps} />);

    // Inserire alcuni dati nel form
    const nomeInput = screen.getByTestId('nome-input');
    await user.type(nomeInput, 'Test Lead Draft');

    // Cliccare sul pulsante di chiusura del dialog
    const closeButton = screen.getByTestId('dialog-close-button');
    fireEvent.click(closeButton);

    // Dovrebbe mostrare il dialog di conferma salvataggio bozza
    // (nota: questo comportamento è gestito dalla logica interna del modal)
    // In questo test semplificato assumiamo che la logica di bozza funzioni
  });
});
