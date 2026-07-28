import type React from 'react'

/**
 * Efface dynamiquement l'erreur d'un champ spécifique ainsi que l'erreur globale.
 */
export function clearFieldError<E extends object>(
  setErrors: React.Dispatch<React.SetStateAction<E>>,
  field: keyof E
) {
  setErrors((prev) => {
    if (!prev[field] && !(prev as { global?: string }).global) return prev
    return {
      ...prev,
      [field]: undefined,
      global: undefined,
    }
  })
}

/**
 * Helper qui met à jour la valeur d'un champ du formulaire et efface automatiquement ses erreurs associées.
 */
export function updateFormField<
  F extends object,
  E extends object
>(
  field: keyof F,
  value: F[keyof F],
  setForm: React.Dispatch<React.SetStateAction<F>>,
  setErrors?: React.Dispatch<React.SetStateAction<E>>
) {
  setForm((prev) => ({ ...prev, [field]: value }))
  if (setErrors) {
    clearFieldError(setErrors, field as unknown as keyof E)
  }
}
