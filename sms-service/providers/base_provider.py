class BaseSMSProvider:
    def send(self, phone: str, message: str) -> bool:
        raise NotImplementedError