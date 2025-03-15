require 'rails_helper'

RSpec.describe "expense_reports/show", type: :view do
  before(:each) do
    assign(:expense_report, ExpenseReport.create!(
      amount: "9.99",
      description: "MyText",
      receipt: nil
    ))
  end

  it "renders attributes in <p>" do
    render
    expect(rendered).to match(/9.99/)
    expect(rendered).to match(/MyText/)
    expect(rendered).to match(//)
  end
end
