Rails.application.routes.draw do
  root "scan#index"

  get "/dbr", to: "scan#dbr", as: :dbr
  get "/webondevices", to: "scan#webondevices", as: :webondevices
end
