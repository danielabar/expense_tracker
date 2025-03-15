require 'rails_helper'

RSpec.describe "expense_reports/index", type: :view do
  before(:each) do
    assign(:expense_reports, [
      ExpenseReport.create!(
        amount: "9.99",
        description: "MyText",
        receipt: nil
      ),
      ExpenseReport.create!(
        amount: "9.99",
        description: "MyText",
        receipt: nil
      )
    ])
  end

  it "renders a list of expense_reports" do
    render
    cell_selector = 'div>p'
    assert_select cell_selector, text: Regexp.new("9.99".to_s), count: 2
    assert_select cell_selector, text: Regexp.new("MyText".to_s), count: 2
    assert_select cell_selector, text: Regexp.new(nil.to_s), count: 2
  end
end
