FactoryBot.define do
  factory :expense_report do
    amount { "9.99" }
    description { "MyText" }
    incurred_on { "2025-03-13" }
    receipt { nil }
  end
end
