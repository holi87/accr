interface ShowWhenContext {
  applicationType: string[];
  entityType: string;
  multipleProducts?: boolean;
}

/**
 * Evaluates showWhen condition against current form context.
 * null showWhen = always visible.
 * All conditions are AND-ed.
 */
export function evaluateShowWhen(
  showWhen: unknown,
  context: ShowWhenContext
): boolean {
  if (!showWhen || typeof showWhen !== 'object') return true;

  const conditions = showWhen as Record<string, unknown>;

  for (const [key, value] of Object.entries(conditions)) {
    switch (key) {
      case 'applicationType': {
        // value is an array of required types — at least one must be in context
        if (Array.isArray(value)) {
          const contextTypes = context.applicationType.map(normalizeType);
          const hasMatch = value.some((v: string) =>
            contextTypes.includes(normalizeType(v))
          );
          if (!hasMatch) return false;
        }
        break;
      }
      case 'entityType': {
        if (typeof value === 'string') {
          if (normalizeEntityType(context.entityType) !== normalizeEntityType(value)) {
            return false;
          }
        }
        break;
      }
      case 'multipleProducts': {
        if (value === true && !context.multipleProducts) return false;
        break;
      }
    }
  }

  return true;
}

function normalizeType(t: string): string {
  const lower = t.toLowerCase();
  if (lower.includes('materiał') || lower.includes('material')) return 'materialy';
  if (lower.includes('dostawc') || lower.includes('provider')) return 'dostawca';
  return lower;
}

function normalizeEntityType(t: string): string {
  const lower = t.toLowerCase();
  if (lower.includes('fizyczn') || lower === 'fizyczna') return 'fizyczna';
  if (lower.includes('prawn') || lower === 'prawna') return 'prawna';
  return lower;
}
