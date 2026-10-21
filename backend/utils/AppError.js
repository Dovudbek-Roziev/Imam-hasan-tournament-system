// RU: Ожидаемая ошибка с безопасным русским сообщением для клиента.
// EN: An expected error with a safe Russian message for the client.
class AppError extends Error {
    // RU: Сохранить HTTP-статус и стабильный технический код ошибки.
    // EN: Store the HTTP status and a stable machine-readable error code.
    constructor(statusCode, message, code = 'REQUEST_ERROR') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

module.exports = AppError;
