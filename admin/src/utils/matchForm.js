// RU: Создать обработчик, который поддерживает обновление одного поля и именованного поля формы.
// EN: Create an updater that supports both a custom field value and named form fields.
export function createCustomFieldUpdater(fieldName, updateField) {
  return (...args) => args.length === 1
    ? updateField(fieldName, args[0])
    : updateField(args[0], args[1]);
}

// RU: Привести события матча к безопасному массиву перед открытием протокола.
// EN: Normalize match events to a safe array before opening the protocol editor.
export function normalizeMatchEvents(events) {
  return Array.isArray(events) ? events.filter((event) => event && typeof event === 'object') : [];
}
