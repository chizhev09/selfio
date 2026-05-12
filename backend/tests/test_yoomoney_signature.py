# Тест подписи HTTP-уведомления ЮMoney по примеру из официальной документации (строка + HMAC-SHA256).
import unittest

from app.payments.signature import verify_yoomoney_notification_sign


class YooMoneyNotificationSignatureTests(unittest.TestCase):
    """Проверяет вычисление sign для уведомления p2p-incoming."""

    def test_example_from_payment_buttons_doc(self) -> None:
        """Сверяет подпись с примером из раздела уведомлений API кнопок сбора ЮMoney."""
        params = {
            "notification_type": "p2p-incoming",
            "operation_id": "441361714955017004",
            "amount": "98.00",
            "withdraw_amount": "100.00",
            "currency": "643",
            "datetime": "2013-12-26T08:28:34Z",
            "sender": "41000000000",
            "codepro": "false",
            "label": "ML23045",
            "unaccepted": "false",
            "sha1_hash": "ac13833bd6ba9eff1fa9e4bed76f3d6ebb57f6c0",
            "sign": "a452af731650e2c5b39abcdc7c28dd27db7b3b654c2230ad2c386e64afb98605",
        }
        self.assertTrue(verify_yoomoney_notification_sign(params, "secret123"))

    def test_wrong_secret_rejected(self) -> None:
        """При неверном секрете возвращает False."""
        params = {
            "notification_type": "p2p-incoming",
            "operation_id": "441361714955017004",
            "amount": "98.00",
            "withdraw_amount": "100.00",
            "currency": "643",
            "datetime": "2013-12-26T08:28:34Z",
            "sender": "41000000000",
            "codepro": "false",
            "label": "ML23045",
            "unaccepted": "false",
            "sha1_hash": "ac13833bd6ba9eff1fa9e4bed76f3d6ebb57f6c0",
            "sign": "a452af731650e2c5b39abcdc7c28dd27db7b3b654c2230ad2c386e64afb98605",
        }
        self.assertFalse(verify_yoomoney_notification_sign(params, "wrong-secret"))


if __name__ == "__main__":
    unittest.main()
