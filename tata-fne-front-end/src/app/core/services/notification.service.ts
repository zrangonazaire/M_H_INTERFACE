import { Injectable } from '@angular/core';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notyf: Notyf;

  constructor() {
    this.notyf = new Notyf({
      duration: 4000,
      position: {
        x: 'right',
        y: 'top',
      },
      types: [
        {
          type: 'success',
          background: '#10b981',
          icon: {
            className: 'notyf__icon--success',
            tagName: 'i',
          },
        },
        {
          type: 'error',
          background: '#ef4444',
          icon: {
            className: 'notyf__icon--error',
            tagName: 'i',
          },
        },
        {
          type: 'warning',
          background: '#f59e0b',
          icon: {
            className: 'notyf__icon--warning',
            tagName: 'i',
          },
        },
        {
          type: 'info',
          background: '#3b82f6',
          icon: {
            className: 'notyf__icon--info',
            tagName: 'i',
          },
        },
      ],
    });
  }

  success(message: string): void {
    this.notyf.success(message);
  }

  error(message: string): void {
    this.notyf.error(message);
  }

  warning(message: string): void {
    this.notyf.open({
      type: 'warning',
      message,
    });
  }

  info(message: string): void {
    this.notyf.open({
      type: 'info',
      message,
    });
  }

  /**
   * Affiche une boîte de dialogue de confirmation personnalisée
   * Retourne une Promise qui se résout avec true si confirmé, false sinon
   */
  confirm(message: string, title: string = 'Confirmation'): Promise<boolean> {
    return new Promise((resolve) => {
      // Créer l'overlay de fond
      const overlay = document.createElement('div');
      overlay.className = 'custom-confirm-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;

      // Créer la boîte de dialogue
      const dialog = document.createElement('div');
      dialog.className = 'custom-confirm-dialog';
      dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        min-width: 350px;
        max-width: 450px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: confirmSlideIn 0.3s ease;
      `;

      // Ajouter l'animation CSS
      if (!document.getElementById('confirm-animation')) {
        const style = document.createElement('style');
        style.id = 'confirm-animation';
        style.textContent = `
          @keyframes confirmSlideIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }

      // Titre
      const titleEl = document.createElement('h3');
      titleEl.textContent = title;
      titleEl.style.cssText = `
        margin: 0 0 12px 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: #1f2937;
      `;

      // Message
      const messageEl = document.createElement('p');
      messageEl.textContent = message;
      messageEl.style.cssText = `
        margin: 0 0 24px 0;
        font-size: 1rem;
        color: #4b5563;
        line-height: 1.5;
      `;

      // Container des boutons
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      `;

      // Bouton Annuler
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Annuler';
      cancelBtn.style.cssText = `
        padding: 10px 20px;
        border: 1px solid #d1d5db;
        background: white;
        color: #374151;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      `;
      cancelBtn.onmouseover = () => {
        cancelBtn.style.background = '#f3f4f6';
      };
      cancelBtn.onmouseout = () => {
        cancelBtn.style.background = 'white';
      };

      // Bouton Confirmer
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Confirmer';
      confirmBtn.style.cssText = `
        padding: 10px 20px;
        border: none;
        background: #d32f2f;
        color: white;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      `;
      confirmBtn.onmouseover = () => {
        confirmBtn.style.background = '#b71c1c';
      };
      confirmBtn.onmouseout = () => {
        confirmBtn.style.background = '#d32f2f';
      };

      // Assemblage
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(confirmBtn);
      dialog.appendChild(titleEl);
      dialog.appendChild(messageEl);
      dialog.appendChild(buttonContainer);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Gestionnaires d'événements
      const cleanup = () => {
        document.body.removeChild(overlay);
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // Fermer en cliquant sur l'overlay
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });

      // Fermer avec Escape
      const escapeHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    });
  }
}
