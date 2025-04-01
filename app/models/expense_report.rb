class ExpenseReport < ApplicationRecord
  has_one_attached :receipt
  has_one_attached :approval_document

  validates :amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :description, presence: true
  validates :incurred_on, presence: true
end
