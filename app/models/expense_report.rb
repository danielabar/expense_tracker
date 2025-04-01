class ExpenseReport < ApplicationRecord
  has_one_attached :receipt
  # Don't forget to add this to params in expense reports controller
  has_one_attached :approval_document

  validates :amount, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :description, presence: true
  validates :incurred_on, presence: true
end
