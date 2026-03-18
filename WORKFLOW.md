# Workflow akredytacji ISTQB® — opis procesu

## Statusy zgłoszenia

Każde zgłoszenie przechodzi przez następujące etapy:

```
NOWE → WERYFIKACJA KOMPLETNOŚCI → OCZEKIWANIE NA PŁATNOŚĆ → W RECENZJI → [OCZEKIWANIE NA POPRAWKI ↔ PONOWNA RECENZJA] → ZAAKCEPTOWANE / ODRZUCONE
```

| Status | Opis | Kto odpowiada |
|--------|------|---------------|
| **Nowe zgłoszenie** | Wniosek wpłynął, oczekuje na weryfikację | Koordynator |
| **Weryfikacja kompletności** | Sprawdzanie czy pakiet dokumentów jest kompletny (10 dni rob.) | SJSI / Koordynator |
| **Oczekiwanie na płatność** | Faktura wystawiona, oczekiwanie na wpłatę | Księgowość |
| **W recenzji** | Materiały przekazane recenzentom (powołanie: 20 dni rob., recenzja: 13 dni rob.) | SJSI / Recenzenci |
| **Oczekiwanie na poprawki** | Recenzenci zgłosili uwagi, klient ma 10 dni rob. na poprawki (maks. 3 iteracje) | Klient |
| **Ponowna recenzja** | Poprawione materiały ponownie oceniane przez recenzentów | SJSI / Recenzenci |
| **Zaakceptowane** | Wniosek zaakceptowany, certyfikat wystawiony | Zarząd SJSI |
| **Odrzucone** | Wniosek odrzucony (po 3 iteracjach bez sukcesu — nowy wniosek po 30 dniach) | SJSI |

## Iteracje poprawek

System automatycznie liczy iteracje. Przy każdej zmianie na "Oczekiwanie na poprawki" licznik rośnie. Maksymalnie 3 iteracje — po przekroczeniu wniosek jest odrzucany.

Numer iteracji widoczny jest:
- W panelu admina (szczegóły zgłoszenia)
- Na publicznej stronie śledzenia

## Link śledzenia statusu

Każde zgłoszenie otrzymuje unikalny token UUID. Po złożeniu wniosku klient widzi link:

```
https://twoja-domena.pl/track/<uuid>
```

Link pozwala **bez logowania** sprawdzić:
- Aktualny status zgłoszenia
- Numer iteracji (jeśli dotyczy)
- Datę złożenia i ostatniej aktualizacji
- Pełną historię zmian statusu z komentarzami

Link jest także dostępny w panelu admina (szczegóły zgłoszenia) — można go skopiować i wysłać klientowi emailem.

## Historia zmian statusu

Każda zmiana statusu jest logowana z:
- Data i godzina
- Status przed i po zmianie
- Opcjonalny komentarz (np. "Brak macierzy pokrycia LO — proszę o uzupełnienie")

Historia widoczna zarówno w panelu admina jak i na publicznej stronie śledzenia.

## Cennik

Cennik wyświetlany jest na stronie głównej formularza. Dane pochodzą z API (`GET /api/form/pricing`).

| Usługa | Cena netto (PLN) | Ważność |
|--------|-----------------|---------|
| Akredytacja materiału — j. polski | 7 000,00 | na czas obowiązywania sylabusa |
| Akredytacja materiału — j. angielski | 8 000,00 | na czas obowiązywania sylabusa |
| Przeniesienie materiału szkoleniowego | 3 250,00 | jednorazowo za materiał |
| Przeniesienie dostawcy szkoleń | 1 200,00 | jednorazowo za dostawcę |
| Roczne utrzymanie dostawcy na liście | 1 200,00 | rocznie za dostawcę |
| Materiał powiązany z dostawcą | 150,00 | rocznie za materiał |
| Crossakredytacja | 0,00 | 10 dni roboczych |

Do cen należy doliczyć VAT 23%.

## Szacowany czas procesu

| Faza | Czas (dni rob.) |
|------|----------------|
| Złożenie wniosku + weryfikacja kompletności | 10 |
| Powołanie recenzentów | 20 |
| Przegląd merytoryczny | 13 |
| Iteracje poprawek (0–3×) | 0–30 |
| Decyzja + certyfikat | 5–10 |
| **Łącznie** | **ok. 48–83 dni rob. (2–4 miesiące)** |

## Crossakredytacja

Materiały akredytowane przez inną Radę Krajową ISTQB® mogą uzyskać crossakredytację SJSI:
- Bezpłatna
- Realizacja: 10 dni roboczych
- Wymagany: skan certyfikatu z innej Rady + formularz z opcją "crossakredytacja"
